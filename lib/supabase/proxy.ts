import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard", "/chat", "/onboarding", "/meals", "/pantry", "/profile", "/swiggy", "/barcode"]
const AUTH_ONLY_PATHS = ["/auth/login", "/auth/sign-up"]

// Origins allowed to make cross-origin requests to the API.
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
].filter(Boolean)

// ── Security helpers ─────────────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Permissions-Policy", "camera=(self), microphone=()")
  return response
}

function applyCORS(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin")
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.headers.set("Access-Control-Allow-Credentials", "true")
  }
  return response
}

// ── Main middleware ──────────────────────────────────────────────────────────

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle CORS preflight (OPTIONS)
  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 })
    return applyCORS(request, addSecurityHeaders(preflight))
  }

  let supabaseResponse = NextResponse.next({ request })

  // API routes handle their own auth — skip getUser() here to avoid
  // double Supabase round-trips and edge-runtime timeout issues.
  if (pathname.startsWith("/api/")) {
    return applyCORS(request, addSecurityHeaders(supabaseResponse))
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

  // For server action requests (POST with `next-action` header), do a full
  // getUser() so the session tokens are refreshed BEFORE the action handler
  // runs. This prevents the action's own getUser() from having to do both
  // token refresh + validation — which doubles the timeout window.
  const isServerAction = request.headers.get("next-action") !== null

  if (isServerAction) {
    try {
      await supabase.auth.getUser()
    } catch {
      // Non-fatal — the action handler has its own retry logic.
      // This is purely a best-effort session refresh.
    }
  }

  // Use getSession() instead of getUser() for route guard checks.
  // getSession() reads from the JWT cookie locally (no Supabase network call),
  // saving ~100-150ms per navigation. The authoritative getUser() verification
  // still happens in the RSC layout and API routes — the middleware only needs
  // to know "is there a valid session cookie?" for redirect logic.
  let user = null
  try {
    const { data } = await supabase.auth.getSession()
    user = data.session?.user ?? null
  } catch (err) {
    // Supabase auth can timeout on slow connections — don't crash the proxy.
    // Protected-route redirect will still fire (user stays null).
    console.warn("[proxy] auth.getSession() failed:", err instanceof Error ? err.message : err)
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname === p)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("next", pathname)
    return addSecurityHeaders(NextResponse.redirect(url))
  }

  if (isAuthOnly && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return addSecurityHeaders(NextResponse.redirect(url))
  }

  return addSecurityHeaders(supabaseResponse)
}
