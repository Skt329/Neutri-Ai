import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateWeeklyReport, formatReportMarkdown } from "@/lib/ai/weekly-report"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const maxDuration = 120

/**
 * Weekly report cron — generates and delivers a nutrition summary
 * to each active user as a new chat conversation.
 *
 * Schedule: Sunday 8:00 AM UTC (configure in vercel.json or cron provider)
 * Trigger: POST /api/cron/weekly-report with Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types
  const admin = createAdminClient() as any
  const weekEnd = new Date()
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  logger.info("weekly-report", "Starting weekly report generation", {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  })

  // Find users who logged at least 1 meal in the past week
  const { data: activeUsers, error: usersErr } = await admin
    .from("meal_logs")
    .select("user_id")
    .gte("logged_at", weekStart.toISOString())
    .limit(1000)

  if (usersErr) {
    logger.error("weekly-report", "Failed to query active users", { error: usersErr.message })
    return NextResponse.json({ error: "Failed to query users" }, { status: 500 })
  }

  // Deduplicate user IDs
  const userIds = [...new Set((activeUsers ?? []).map((r: { user_id: string }) => r.user_id))]
  logger.info("weekly-report", `Found ${userIds.length} active users`)

  let successCount = 0
  let errorCount = 0

  // Process in batches of 10
  const BATCH_SIZE = 10
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (userId) => {
        try {
          // Fetch user's meals for the week
          const { data: meals } = await admin
            .from("meal_logs")
            .select("logged_at, calories, protein_g, carbs_g, fat_g")
            .eq("user_id", userId)
            .gte("logged_at", weekStart.toISOString())
            .lte("logged_at", weekEnd.toISOString())
            .order("logged_at", { ascending: true })

          if (!meals || meals.length === 0) return

          // Fetch targets
          const { data: target } = await admin
            .from("nutrition_targets")
            .select("calories, protein_g")
            .eq("user_id", userId)
            .order("effective_from", { ascending: false })
            .limit(1)
            .maybeSingle()

          // Compute streak (simple: count consecutive days with meals ending today)
          const { data: streakMeals } = await admin
            .from("meal_logs")
            .select("logged_at")
            .eq("user_id", userId)
            .gte("logged_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .order("logged_at", { ascending: false })

          const daysWithMeals = new Set(
            (streakMeals ?? []).map((m: { logged_at: string }) => m.logged_at.slice(0, 10)),
          )
          let streakDays = 0
          const today = new Date()
          for (let d = 0; d < 30; d++) {
            const day = new Date(today.getTime() - d * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10)
            if (daysWithMeals.has(day)) streakDays++
            else break
          }

          // Generate report
          const report = generateWeeklyReport({
            meals,
            targets: target ? { calories: target.calories, protein_g: target.protein_g } : null,
            streakDays,
            weekStart,
            weekEnd,
          })

          const markdown = formatReportMarkdown(report)

          // Create a new conversation for the report
          const { data: convo, error: convoErr } = await admin
            .from("conversations")
            .insert({
              user_id: userId,
              title: `Weekly Report: ${report.weekStart} → ${report.weekEnd}`,
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single()

          if (convoErr || !convo) {
            logger.error("weekly-report", `Failed to create conversation for ${userId}`, {
              error: convoErr?.message,
            })
            errorCount++
            return
          }

          // Insert the report as an assistant message
          const { error: msgErr } = await admin.from("messages").insert({
            conversation_id: convo.id,
            user_id: userId,
            role: "assistant",
            parts: [{ type: "text", text: markdown }],
            ordinal: 0,
          })

          if (msgErr) {
            logger.error("weekly-report", `Failed to insert report message for ${userId}`, {
              error: msgErr.message,
            })
            errorCount++
            return
          }

          successCount++
        } catch (err) {
          logger.error("weekly-report", `Error processing user ${userId}`, {
            error: err instanceof Error ? err.message : String(err),
          })
          errorCount++
        }
      }),
    )
  }

  logger.info("weekly-report", "Weekly report generation complete", {
    total: userIds.length,
    success: successCount,
    errors: errorCount,
  })

  return NextResponse.json({
    ok: true,
    total: userIds.length,
    success: successCount,
    errors: errorCount,
  })
}
