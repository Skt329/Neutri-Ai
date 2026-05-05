"use server"

import { redirect } from "next/navigation"
import { revalidateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { CACHE_TAGS } from "@/lib/supabase/queries"

// ── Shared resilient auth helper ───────────────────────────────────────
// Retries getUser() up to 3 times with exponential backoff.
// Inspects both the `error` field and caught exceptions — unlike a bare
// `if (!user)` check, this distinguishes timeouts from genuine 401s.
async function getAuthenticatedUser() {
  const supabase = await createClient()
  let user = null
  let lastError: unknown = null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        lastError = error
        console.warn(
          `[actions] getUser() attempt ${attempt + 1} error:`,
          error.message,
        )
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
          continue
        }
      }
      user = data.user
      if (user) break
    } catch (err) {
      lastError = err
      console.warn(
        `[actions] getUser() attempt ${attempt + 1} threw:`,
        err instanceof Error ? err.message : err,
      )
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
      }
    }
  }

  if (!user) {
    const msg =
      lastError instanceof Error && lastError.message.includes("timeout")
        ? "Connection timed out. Please try again."
        : "Not authenticated"
    throw new Error(msg)
  }

  return { user, supabase }
}

/**
 * Creates a conversation row and returns the ID without redirecting.
 * Used by ChatView for lazy/deferred creation on first message send.
 */
export async function createConversationOnly(): Promise<string> {
  const { user, supabase } = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, title: null })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  revalidateTag(CACHE_TAGS.conversations, { expire: 0 })
  return data.id
}

export async function createConversation(): Promise<void> {
  const { user, supabase } = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, title: null })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  revalidateTag(CACHE_TAGS.conversations, { expire: 0 })
  redirect(`/chat/${data.id}`)
}

export async function deleteConversation(id: string): Promise<void> {
  const { user, supabase } = await getAuthenticatedUser()
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidateTag(CACHE_TAGS.conversations, { expire: 0 })
}

export async function renameConversation(
  id: string,
  title: string,
): Promise<void> {
  const { user, supabase } = await getAuthenticatedUser()
  const clean = title.trim().slice(0, 120)
  const { error } = await supabase
    .from("conversations")
    .update({ title: clean || null })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidateTag(CACHE_TAGS.conversations, { expire: 0 })
}
