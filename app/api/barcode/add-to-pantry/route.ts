/**
 * POST /api/barcode/add-to-pantry
 *
 * Authenticated endpoint to add a scanned product to the user's pantry.
 * Uses the same Supabase RLS-protected insert as the agentic pipeline.
 */

import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { PANTRY_CATEGORIES } from "@/lib/categories"

const AddSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.number().min(0).default(1),
  unit: z.string().max(20).default("pcs"),
  category: z.enum(PANTRY_CATEGORIES),
  barcode: z.string().optional(),
  calories_kcal: z.number().min(0).nullable().default(null),
  protein_g: z.number().min(0).nullable().default(null),
  carbs_g: z.number().min(0).nullable().default(null),
  fat_g: z.number().min(0).nullable().default(null),
  fiber_g: z.number().min(0).nullable().default(null),
  nutrition_basis: z.string().default("per_100g"),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = AddSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const item = parsed.data

  try {
    const { data, error } = await supabase
      .from("pantry_items")
      .insert({
        user_id: user.id,
        name: item.name.toLowerCase(),
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        calories_kcal: item.calories_kcal,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
        nutrition_basis: item.nutrition_basis,
      })
      .select("id, name")
      .single()

    if (error) {
      console.error("[api/barcode/add-to-pantry] Insert failed:", error.message)
      return NextResponse.json({ error: "Failed to add item" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, item: data })
  } catch (err) {
    console.error("[api/barcode/add-to-pantry]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
