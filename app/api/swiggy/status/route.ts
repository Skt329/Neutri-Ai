/**
 * GET /api/swiggy/status
 *
 * Returns the current Swiggy connection status for the authenticated user.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSwiggyConnectionStatus } from "@/lib/swiggy/mcp/token-manager"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const status = await getSwiggyConnectionStatus(supabase, user.id)
  return NextResponse.json(status)
}
