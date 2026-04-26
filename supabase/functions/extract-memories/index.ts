// Supabase Edge Function: extract-memories
//
// Trigger: Database Webhook on `public.messages` INSERT where role='assistant'
// or `public.meal_logs` INSERT, depending on how you wire it in the dashboard.
//
// Responsibility: given a row event, use an LLM to extract durable user facts
// (preferences, routines, constraints), embed them, and insert into `public.memories`.
//
// Required secrets (set via `supabase secrets set`):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - AI_GATEWAY_API_KEY   (for embeddings + extraction via the Vercel AI Gateway)
//
// Deploy:
//   supabase functions deploy extract-memories
//   Then create a Database Webhook in the Supabase dashboard pointing at this function.

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE"
  table: string
  record: Record<string, unknown>
  schema: string
  old_record: Record<string, unknown> | null
}

const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1"

async function extractFacts(text: string): Promise<string[]> {
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY")
  if (!apiKey) return []
  const res = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4",
      messages: [
        {
          role: "system",
          content:
            "Extract durable facts about the user from the text. Return a JSON array of short strings. Each string should be a single, standalone fact that will still be useful weeks later (e.g. 'User is lactose intolerant', 'User typically eats lunch around 1pm'). Skip ephemeral things. If nothing is durable, return [].",
        },
        { role: "user", content: text.slice(0, 8000) },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  })
  if (!res.ok) return []
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = json.choices?.[0]?.message?.content ?? "[]"
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string")
    if (Array.isArray((parsed as { facts?: string[] }).facts))
      return (parsed as { facts: string[] }).facts.filter((s) => typeof s === "string")
    return []
  } catch {
    return []
  }
}

async function embed(texts: string[]): Promise<number[][]> {
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY")
  if (!apiKey || texts.length === 0) return texts.map(() => [])
  const res = await fetch(`${AI_GATEWAY_URL}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: texts,
    }),
  })
  if (!res.ok) return texts.map(() => [])
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> }
  return (json.data ?? []).map((d) => d.embedding)
}

function extractTextFromRecord(table: string, record: Record<string, unknown>): string {
  if (table === "messages") {
    const parts = record.parts as Array<{ type: string; text?: string }> | undefined
    return (parts ?? [])
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("\n")
  }
  if (table === "meal_logs") {
    return `Meal: ${record.description ?? ""} (${record.calories ?? 0} kcal)`
  }
  return JSON.stringify(record)
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const payload = (await req.json()) as WebhookPayload
    if (payload.type !== "INSERT") return new Response("ignored", { status: 200 })

    const userId = (payload.record as { user_id?: string }).user_id
    if (!userId) return new Response("no user_id", { status: 200 })

    // Skip non-assistant messages to avoid noise
    if (payload.table === "messages") {
      const role = (payload.record as { role?: string }).role
      if (role !== "user" && role !== "assistant") return new Response("skipped role", { status: 200 })
    }

    const text = extractTextFromRecord(payload.table, payload.record)
    if (!text.trim()) return new Response("empty", { status: 200 })

    const facts = await extractFacts(text)
    if (facts.length === 0) return new Response("no facts", { status: 200 })

    const embeddings = await embed(facts)
    const rows = facts.map((content, i) => ({
      user_id: userId,
      source: payload.table === "messages" ? "chat" : payload.table === "meal_logs" ? "meal" : "manual",
      source_id: (payload.record as { id?: string }).id ?? null,
      content,
      embedding: embeddings[i]?.length ? embeddings[i] : null,
    }))

    const { error } = await supabase.from("memories").insert(rows)
    if (error) {
      console.error("[extract-memories] insert failed", error)
      return new Response(error.message, { status: 500 })
    }
    return new Response(JSON.stringify({ inserted: rows.length }), {
      headers: { "content-type": "application/json" },
    })
  } catch (e) {
    console.error("[extract-memories] error", e)
    return new Response(e instanceof Error ? e.message : "error", { status: 500 })
  }
})
