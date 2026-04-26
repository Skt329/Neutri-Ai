import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * OAuth / email confirmation callback.
 *
 * For email-confirmation links coming from Sign Up we want a clean experience:
 *   1. Verify the code (which silently signs the user in).
 *   2. Sign them right back out so they're forced to log in with their
 *      newly-verified credentials.
 *   3. Redirect to a friendly "Email confirmed" page with a CTA to log in.
 *
 * For other flows (OAuth, magic link, password reset) we keep the existing
 * behaviour: exchange the code and forward to the requested `next` URL.
 *
 * The signup form passes `?confirm=1` in `emailRedirectTo` so this handler
 * can distinguish the two cases.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"
  const isSignupConfirm = searchParams.get("confirm") === "1"

  // Resolve the absolute base URL we should redirect against. Behind Vercel's
  // proxy `origin` is the internal preview URL, so honour x-forwarded-host
  // when present so the user lands on the same host they came from.
  const forwardedHost = request.headers.get("x-forwarded-host")
  const isLocalEnv = process.env.NODE_ENV === "development"
  const baseUrl = isLocalEnv ? origin : forwardedHost ? `https://${forwardedHost}` : origin

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/auth/error`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${baseUrl}/auth/error`)
  }

  if (isSignupConfirm) {
    // Email is now verified. Force a clean sign-in flow rather than dropping
    // the user straight into the app.
    await supabase.auth.signOut()
    return NextResponse.redirect(`${baseUrl}/auth/email-confirmed`)
  }

  return NextResponse.redirect(`${baseUrl}${next}`)
}
