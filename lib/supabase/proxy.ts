import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard", "/chat", "/onboarding", "/meals", "/pantry", "/profile", "/swiggy"]
const AUTH_ONLY_PATHS = ["/auth/login", "/auth/sign-up"]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl

  // API routes handle their own auth — skip getUser() here to avoid
  // double Supabase round-trips and edge-runtime timeout issues.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    // Supabase auth can timeout on slow connections — don't crash the proxy.
    // Protected-route redirect will still fire (user stays null).
    console.warn("[proxy] auth.getUser() failed:", err instanceof Error ? err.message : err)
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname === p)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthOnly && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
