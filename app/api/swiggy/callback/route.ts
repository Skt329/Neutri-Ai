/**
 * GET /api/swiggy/callback
 *
 * OAuth 2.1 callback handler. Swiggy redirects here after user consent.
 * Exchanges the authorization code + PKCE verifier for an access token,
 * stores the encrypted token in Supabase, and redirects back to the profile page.
 */

import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { exchangeCodeForToken, storeToken } from "@/lib/swiggy/mcp/token-manager"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const profileUrl = `${appUrl}/profile`

  if (!user) {
    return NextResponse.redirect(`${profileUrl}?swiggy=error&reason=unauthorized`)
  }

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error) {
    console.error("[swiggy/callback] OAuth error:", error, url.searchParams.get("error_description"))
    return NextResponse.redirect(`${profileUrl}?swiggy=error&reason=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${profileUrl}?swiggy=error&reason=missing_code`)
  }

  // Retrieve PKCE verifier from cookie
  const codeVerifier = req.cookies.get("swiggy_pkce_verifier")?.value
  if (!codeVerifier) {
    return NextResponse.redirect(`${profileUrl}?swiggy=error&reason=missing_verifier`)
  }

  const clientId = process.env.SWIGGY_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${profileUrl}?swiggy=error&reason=not_configured`)
  }

  const redirectUri = `${appUrl}/api/swiggy/callback`

  try {
    const tokenData = await exchangeCodeForToken({
      code,
      codeVerifier,
      clientId,
      redirectUri,
    })

    await storeToken(supabase, user.id, tokenData)

    // Clear the PKCE cookie
    const response = NextResponse.redirect(`${profileUrl}?swiggy=connected`)
    response.cookies.set("swiggy_pkce_verifier", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/api/swiggy",
    })
    return response
  } catch (err) {
    console.error("[swiggy/callback] Token exchange failed:", err)
    return NextResponse.redirect(
      `${profileUrl}?swiggy=error&reason=${encodeURIComponent(err instanceof Error ? err.message : "token_exchange_failed")}`,
    )
  }
}
