/**
 * POST /api/swiggy/disconnect
 *
 * Revokes the user's Swiggy token and disconnects the integration.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revokeToken } from "@/lib/swiggy/mcp/token-manager"

export const runtime = "nodejs"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await revokeToken(supabase, user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[swiggy/disconnect] Failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disconnect" },
      { status: 500 },
    )
  }
}
