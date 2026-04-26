"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { computeTargets } from "@/lib/nutrition"
import type { ActivityLevel, CookingSkill, Goal, Sex } from "@/lib/types"

const ProfileSchema = z.object({
  full_name: z.string().min(1).max(120),
  age: z.coerce.number().int().min(13).max(120),
  sex: z.enum(["male", "female", "other", "prefer_not_say"]),
  height_cm: z.coerce.number().min(80).max(260),
  weight_kg: z.coerce.number().min(25).max(400),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["lose", "maintain", "gain", "recomp"]),
  cooking_skill: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  household_size: z.coerce.number().int().min(1).max(20).default(1),
  dietary_preferences: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  health_conditions: z.array(z.string()).default([]),
  kitchen_appliances: z.array(z.string()).default([]),
  cuisines: z.array(z.string()).default([]),
  favorite_ingredients: z.array(z.string()).default([]),
  disliked_ingredients: z.array(z.string()).default([]),
  timezone: z.string().default("UTC"),
})

export type ActionState = { ok: true } | { ok: false; error: string } | null

function parseTags(v: FormDataEntryValue | null): string[] {
  if (!v || typeof v !== "string") return []
  const sep = v.includes("||") ? "||" : ","
  return v
    .split(sep)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const parsed = ProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    age: formData.get("age"),
    sex: formData.get("sex"),
    height_cm: formData.get("height_cm"),
    weight_kg: formData.get("weight_kg"),
    activity_level: formData.get("activity_level"),
    goal: formData.get("goal"),
    cooking_skill: formData.get("cooking_skill") || "intermediate",
    household_size: formData.get("household_size") || 1,
    dietary_preferences: parseTags(formData.get("dietary_preferences")),
    allergies: parseTags(formData.get("allergies")),
    health_conditions: parseTags(formData.get("health_conditions")),
    kitchen_appliances: parseTags(formData.get("kitchen_appliances")),
    cuisines: parseTags(formData.get("cuisines")),
    favorite_ingredients: parseTags(formData.get("favorite_ingredients")),
    disliked_ingredients: parseTags(formData.get("disliked_ingredients")),
    timezone: formData.get("timezone") || "UTC",
  })

  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" }
  const data = parsed.data

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.full_name,
      age: data.age,
      sex: data.sex as Sex,
      height_cm: data.height_cm,
      weight_kg: data.weight_kg,
      activity_level: data.activity_level as ActivityLevel,
      goal: data.goal as Goal,
      cooking_skill: data.cooking_skill as CookingSkill,
      household_size: data.household_size,
      dietary_preferences: data.dietary_preferences,
      allergies: data.allergies,
      health_conditions: data.health_conditions,
      kitchen_appliances: data.kitchen_appliances,
      cuisines: data.cuisines,
      favorite_ingredients: data.favorite_ingredients,
      disliked_ingredients: data.disliked_ingredients,
      timezone: data.timezone,
    })
    .eq("id", user.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/profile")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function recomputeTargets(): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("age, sex, height_cm, weight_kg, activity_level, goal")
    .eq("id", user.id)
    .maybeSingle()
  if (error || !profile) return { ok: false, error: error?.message ?? "Profile not found" }
  if (
    !profile.age ||
    !profile.sex ||
    !profile.height_cm ||
    !profile.weight_kg ||
    !profile.activity_level ||
    !profile.goal
  ) {
    return { ok: false, error: "Please fill in all required profile fields first." }
  }

  const t = computeTargets({
    age: profile.age,
    sex: profile.sex as Sex,
    height_cm: Number(profile.height_cm),
    weight_kg: Number(profile.weight_kg),
    activity_level: profile.activity_level as ActivityLevel,
    goal: profile.goal as Goal,
  })
  const { error: insErr } = await supabase.from("nutrition_targets").insert({ user_id: user.id, ...t })
  if (insErr) return { ok: false, error: insErr.message }

  revalidatePath("/profile")
  revalidatePath("/dashboard")
  return { ok: true }
}
