"use server"

import { revalidateTag } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { CACHE_TAGS } from "@/lib/supabase/queries"

const PantrySchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).nullable()),
  unit: z.preprocess((v) => (v === "" ? null : v), z.string().max(20).nullable()),
  category: z.preprocess((v) => (v === "" ? null : v), z.string().max(40).nullable()),
  expires_on: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD").nullable(),
  ),
})

export type ActionState = { ok: true } | { ok: false; error: string } | null

export async function addPantryItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const parsed = PantrySchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    expires_on: formData.get("expires_on"),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" }

  const { error } = await supabase.from("pantry_items").insert({ user_id: user.id, ...parsed.data })
  if (error) return { ok: false, error: error.message }
  revalidateTag(CACHE_TAGS.pantry, { expire: 0 })
  return { ok: true }
}

export async function deletePantryItem(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }
  const { error } = await supabase.from("pantry_items").delete().eq("id", id).eq("user_id", user.id)
  if (error) return { ok: false, error: error.message }
  revalidateTag(CACHE_TAGS.pantry, { expire: 0 })
  return { ok: true }
}
