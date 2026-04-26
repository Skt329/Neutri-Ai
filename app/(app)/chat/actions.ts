"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

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
  revalidatePath("/chat")
  redirect(`/chat/${data.id}`)
}

export async function deleteConversation(id: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { error } = await supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/chat")
  redirect("/chat")
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
  revalidatePath("/chat")
}
