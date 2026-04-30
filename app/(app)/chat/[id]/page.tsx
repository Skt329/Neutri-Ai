import { notFound } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/auth"
import { ChatView } from "./chat-view"
import type { UIMessage } from "ai"

export const dynamic = "force-dynamic"

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, supabase } = await getAuthUser()
  if (!user) return null

  // ── Lazy creation: "/chat/new" renders an empty ChatView ──
  // No DB row is created until the user sends their first message.
  if (id === "new") {
    return (
      <ChatView
        conversationId={null}
        initialMessages={[]}
        title={null}
        caloriesLeft={null}
        proteinLeft={null}
        goalLabel={null}
      />
    )
  }

  // Fetch conversation, messages, and nutrition data in parallel
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [convoRes, msgsRes, mealsRes, targetsRes, profileRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, title")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, role, parts, ordinal")
      .eq("conversation_id", id)
      .order("ordinal", { ascending: true })
      .limit(200),
    supabase
      .from("meal_logs")
      .select("calories, protein_g")
      .eq("user_id", user.id)
      .gte("logged_at", dayStart),
    supabase
      .from("nutrition_targets")
      .select("calories, protein_g")
      .eq("user_id", user.id)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("goal")
      .eq("id", user.id)
      .maybeSingle(),
  ])

  if (!convoRes.data) notFound()

  // ── Reconstruct UIMessages with resolved client tool outputs ──
  // Client tools (propose_meal_log, ask_user, etc.) are saved to DB with
  // state "call" and no output because the user's confirmation was sent as
  // a separate auto-round-trip. On reload, this would render them as
  // interactive forms again. Fix: if a client tool part appears in any
  // message that is NOT the last one, the user already responded — we
  // synthesize a default "confirmed" output so the card is read-only.
  const CLIENT_TOOLS = ["propose_meal_log", "ask_user", "choose_option", "propose_pantry_items"]
  const rawMessages = msgsRes.data ?? []

  const initial: UIMessage[] = rawMessages.map((r, msgIndex) => {
    const parts = (r.parts as any[]) ?? []
    const isLastMessage = msgIndex === rawMessages.length - 1

    const fixedParts = parts.map((part: any) => {
      // Only process tool invocation parts for client tools
      const inv = part.toolInvocation ?? part
      const toolName: string | undefined =
        inv.toolName ??
        (typeof part.type === "string" && part.type.startsWith("tool-") && part.type !== "tool-invocation"
          ? part.type.replace(/^tool-/, "")
          : undefined)

      if (!toolName || !CLIENT_TOOLS.includes(toolName)) return part

      // Already has output → no fix needed
      const hasOutput = inv.state === "result" || inv.state === "output-available" || inv.result !== undefined || inv.output !== undefined
      if (hasOutput) return part

      // If this is NOT the last message, subsequent messages exist →
      // the user already confirmed this tool call. Synthesize output.
      if (!isLastMessage) {
        const fixed = { ...part }
        if (fixed.toolInvocation) {
          fixed.toolInvocation = { ...fixed.toolInvocation, state: "result", result: { confirmed: true } }
        } else {
          fixed.state = "result"
          fixed.result = { confirmed: true }
          fixed.output = { confirmed: true }
        }
        return fixed
      }

      return part
    })

    return {
      id: r.id,
      role: r.role as UIMessage["role"],
      parts: fixedParts as UIMessage["parts"],
    }
  })

  // Compute nutrition remaining
  const meals = mealsRes.data ?? []
  const totalCal = meals.reduce((s, m) => s + (m.calories ?? 0), 0)
  const totalPro = meals.reduce((s, m) => s + (m.protein_g ?? 0), 0)
  const targets = targetsRes.data
  const caloriesLeft = targets ? targets.calories - totalCal : null
  const proteinLeft = targets ? targets.protein_g - totalPro : null

  const goalMap: Record<string, string> = {
    lose: 'Weight loss',
    gain: 'Weight gain',
    maintain: 'Maintain',
    recomp: 'Recomp',
  }
  const goalLabel = profileRes.data?.goal ? goalMap[profileRes.data.goal] ?? null : null

  return (
    <ChatView
      conversationId={id}
      initialMessages={initial}
      title={convoRes.data.title}
      caloriesLeft={caloriesLeft}
      proteinLeft={proteinLeft}
      goalLabel={goalLabel}
    />
  )
}
