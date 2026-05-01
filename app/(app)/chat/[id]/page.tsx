import { getAuthUser } from "@/lib/supabase/auth"
import { getProfile } from "@/lib/supabase/profile"
import { getCachedTargets, getCachedTodayMeals } from "@/lib/supabase/queries"
import { ChatView } from "./chat-view"
import { NewChatView } from "./new-chat-view"
import { notFound } from "next/navigation"
import { startOfLocalDayISO } from "@/lib/nutrition"
import type { UIMessage } from "ai"

// This page is inherently dynamic (unique per conversation).
// Removing force-dynamic allows Next.js to apply its own
// optimizations while the page still renders fresh per-request.

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, supabase } = await getAuthUser()
  if (!user) return null

  // ── Lazy creation: "/chat/new" renders a lightweight input-only view ──
  // No DB row, no useChat hook. On first send it creates the conversation
  // and navigates to /chat/{realId}?prefill={message} for seamless handoff.
  if (id === "new") {
    return <NewChatView />
  }

  // Fetch conversation + messages (unique to this page) alongside
  // cached loaders that are already deduped with the layout render.
  const profile = await getProfile()
  const timezone = profile?.timezone || "UTC"
  const dayStart = startOfLocalDayISO(timezone)

  const [convoRes, msgsRes, todayMeals, targets] = await Promise.all([
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
    getCachedTodayMeals(user.id, dayStart),
    getCachedTargets(user.id),
  ])

  if (!convoRes.data) notFound()

  // ── Reconstruct UIMessages with resolved client tool outputs ──
  const CLIENT_TOOLS = ["propose_meal_log", "ask_user", "choose_option", "propose_pantry_items"]
  const rawMessages = msgsRes.data ?? []

  const initial: UIMessage[] = rawMessages.map((r, msgIndex) => {
    const parts = (r.parts as any[]) ?? []
    const isLastMessage = msgIndex === rawMessages.length - 1


    const fixedParts = parts.map((part: any, partIndex: number) => {
      const inv = part.toolInvocation ?? part
      const toolName: string | undefined =
        inv.toolName ??
        (typeof part.type === "string" && part.type.startsWith("tool-") && part.type !== "tool-invocation"
          ? part.type.replace(/^tool-/, "")
          : undefined)

      if (!toolName || !CLIENT_TOOLS.includes(toolName)) return part

      const hasOutput = inv.state === "result" || inv.state === "output-available" || inv.result !== undefined || inv.output !== undefined
      if (hasOutput) return part

      // Determine if this tool invocation was already handled:
      // 1. It's NOT the last message (a follow-up message exists) → definitely resolved
      // 2. It IS the last message but subsequent parts exist after this tool part
      //    (e.g. a text continuation like "I've logged your meal...") → resolved
      const hasSubsequentParts = partIndex < parts.length - 1 &&
        parts.slice(partIndex + 1).some((p: any) => p.type === "text" && p.text?.trim())

      if (!isLastMessage || hasSubsequentParts) {
        const fixed = { ...part }
        if (fixed.toolInvocation) {
          fixed.toolInvocation = { ...fixed.toolInvocation, state: "output-available", output: { confirmed: true }, result: { confirmed: true } }
        } else {
          fixed.state = "output-available"
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
  const totalCal = todayMeals.reduce((s, m) => s + (m.calories ?? 0), 0)
  const totalPro = todayMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0)
  const caloriesLeft = targets ? targets.calories - totalCal : null
  const proteinLeft = targets ? targets.protein_g - totalPro : null

  const goalMap: Record<string, string> = {
    lose: 'Weight loss',
    gain: 'Weight gain',
    maintain: 'Maintain',
    recomp: 'Recomp',
  }
  const goalLabel = profile?.goal ? goalMap[profile.goal] ?? null : null

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
