import { notFound } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/auth"
import { ChatView } from "./chat-view"
import type { UIMessage } from "ai"

export const dynamic = "force-dynamic"

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, supabase } = await getAuthUser()
  if (!user) return null

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
      .select("id, role, parts, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
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

  const initial: UIMessage[] = (msgsRes.data ?? []).map((r) => ({
    id: r.id,
    role: r.role as UIMessage["role"],
    parts: (r.parts as UIMessage["parts"]) ?? [],
  }))

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
