"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const MealSchema = z.object({
  description: z.string().min(1),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullable(),
  calories: z.coerce.number().min(0),
  protein_g: z.coerce.number().min(0),
  carbs_g: z.coerce.number().min(0),
  fat_g: z.coerce.number().min(0),
  fiber_g: z.coerce.number().min(0).nullable(),
})

export type ActionState = { ok: true } | { ok: false; error: string } | null

export async function addMeal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const parsed = MealSchema.safeParse({
    description: formData.get("description"),
    meal_type: formData.get("meal_type") || null,
    calories: formData.get("calories") || 0,
    protein_g: formData.get("protein_g") || 0,
    carbs_g: formData.get("carbs_g") || 0,
    fat_g: formData.get("fat_g") || 0,
    fiber_g: formData.get("fiber_g") ? formData.get("fiber_g") : null,
  })
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" }

  const { error } = await supabase.from("meal_logs").insert({
    user_id: user.id,
    ...parsed.data,
    items: [],
    source: "manual",
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/meals")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function deleteMeal(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }
  const { error } = await supabase.from("meal_logs").delete().eq("id", id).eq("user_id", user.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/meals")
  revalidatePath("/dashboard")
  return { ok: true }
}
