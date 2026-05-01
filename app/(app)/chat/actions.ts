"use server"

import { redirect } from "next/navigation"
import { revalidateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { CACHE_TAGS } from "@/lib/supabase/queries"

/**
 * Creates a conversation row and returns the ID without redirecting.
 * Used by ChatView for lazy/deferred creation on first message send.
 */
export async function createConversationOnly(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
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
  const supabase = await createClient()
  let user = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
      break
    } catch {
      if (attempt === 1) throw new Error("Connection timed out. Please try again.")
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  if (!user) throw new Error("Not authenticated")
  const { error } = await supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidateTag(CACHE_TAGS.conversations, { expire: 0 })
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const clean = title.trim().slice(0, 120)
  const { error } = await supabase
    .from("conversations")
    .update({ title: clean || null })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidateTag(CACHE_TAGS.conversations, { expire: 0 })
}
