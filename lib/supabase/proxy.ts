import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard", "/chat", "/onboarding", "/meals", "/pantry", "/profile", "/swiggy", "/barcode"]
const AUTH_ONLY_PATHS = ["/auth/login", "/auth/sign-up"]

// Origins allowed to make cross-origin requests to the API.
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  // Always allow localhost in development
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined,
].filter(Boolean) as string[]

// ── Security helpers ─────────────────────────────────────────────────────────

/**
 * Content Security Policy — allowlists all known first-party and
 * third-party origins used by the app.
 *
 * `'unsafe-inline'` is required for Next.js style injection and
 * `'unsafe-eval'` for dev hot-reload (stripped in production ideally,
 * but Next.js SSR still needs it for some dynamic rendering).
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Scripts: self + Vercel Analytics + Sentry
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://*.sentry.io",
  // Styles: self + Google Fonts (inline needed for Next.js)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts: self + Google Fonts static
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self + data URIs + Supabase storage + OpenFoodFacts + Cloudinary
  "img-src 'self' data: blob: https://*.supabase.co https://images.openfoodfacts.org https://world.openfoodfacts.org https://res.cloudinary.com",
  // API connections: self + all backend services
  "connect-src 'self' https://*.supabase.co https://*.upstash.io https://*.openai.azure.com https://integrate.api.nvidia.com https://*.sentry.io https://va.vercel-scripts.com",
  // Workers: self (for service worker / Serwist)
  "worker-src 'self' blob:",
  // No iframes
  "frame-ancestors 'none'",
  // Forms only submit to self
  "form-action 'self'",
  // Base URI restricted to self
  "base-uri 'self'",
].join("; ")

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(self), microphone=()")
  response.headers.set("Content-Security-Policy", CSP_DIRECTIVES)
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

  // Use getUser() for all route guard checks — this verifies the JWT
  // with Supabase's auth server rather than trusting the local cookie.
  // Slightly slower (~100ms) but prevents tampered-JWT bypass.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
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
