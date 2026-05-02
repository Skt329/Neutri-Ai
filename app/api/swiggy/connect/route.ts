/**
 * POST /api/swiggy/connect
 *
 * Initiates the Swiggy OAuth 2.1 + PKCE flow.
 * Generates PKCE pair, stores code_verifier in a httpOnly cookie,
 * and returns the Swiggy authorize URL for the client to redirect to.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generatePKCE, buildAuthorizeUrl } from "@/lib/swiggy/mcp/token-manager"

export const runtime = "nodejs"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const clientId = process.env.SWIGGY_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: "Swiggy integration is not configured on this server." },
      { status: 501 },
    )
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/swiggy/callback`

  const pkce = await generatePKCE()
  const { url: authorizeUrl, state } = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge: pkce.codeChallenge,
  })

  // Store code_verifier + state in a short-lived httpOnly cookie (10 min TTL)
  const response = NextResponse.json({ url: authorizeUrl })
  response.cookies.set("swiggy_pkce_verifier", pkce.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/swiggy",
  })
  response.cookies.set("swiggy_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/swiggy",
  })

  return response
}
