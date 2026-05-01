"use server"

import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { computeTargets } from "@/lib/nutrition"
import type { ActivityLevel, CookingSkill, Goal, Sex } from "@/lib/types"

const OnboardingSchema = z.object({
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

export type OnboardingFormState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | null

function parseTags(v: FormDataEntryValue | null): string[] {
  if (!v || typeof v !== "string") return []
  // ChipInput joins with "||"; legacy onboarding forms may still use commas.
  const sep = v.includes("||") ? "||" : ","
  return v
    .split(sep)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function submitOnboarding(_prev: OnboardingFormState, formData: FormData): Promise<OnboardingFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be signed in." }

  const raw = {
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
    timezone: (formData.get("timezone") as string) || "UTC",
  }

  const parsed = OnboardingSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const data = parsed.data

  const { error: profileError } = await supabase
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
      onboarding_completed: true,
    })
    .eq("id", user.id)

  if (profileError) return { ok: false, error: `Could not save profile: ${profileError.message}` }

  const targets = computeTargets({
    age: data.age,
    sex: data.sex as Sex,
    height_cm: data.height_cm,
    weight_kg: data.weight_kg,
    activity_level: data.activity_level as ActivityLevel,
    goal: data.goal as Goal,
  })

  const { error: targetsError } = await supabase.from("nutrition_targets").insert({
    user_id: user.id,
    calories: targets.calories,
    protein_g: targets.protein_g,
    carbs_g: targets.carbs_g,
    fat_g: targets.fat_g,
    fiber_g: targets.fiber_g,
  })
  if (targetsError) return { ok: false, error: `Could not save targets: ${targetsError.message}` }

  revalidateTag("profile", { expire: 0 })
  revalidateTag("targets", { expire: 0 })
  redirect("/dashboard")
}
