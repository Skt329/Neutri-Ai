import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiError } from "@/lib/validation/with-validation"
import { logger } from "@/lib/logger"
import type { User } from "@supabase/supabase-js"

type AuthenticatedHandler = (
  req: NextRequest,
  context: {
    user: User
    supabase: Awaited<ReturnType<typeof createClient>>
  },
) => Promise<NextResponse>

/**
 * Wraps an API route with:
 *   1. Supabase auth (getUser with retry)
 *   2. Global error boundary
 *   3. Structured error responses
 *
 * Usage:
 *   export const GET = withAuth(async (req, { user, supabase }) => { ... })
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest) => {
    const supabase = await createClient()

    // Auth with retry (2 attempts, 800ms backoff)
    let user: User | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data } = await supabase.auth.getUser()
        user = data.user
        break
      } catch (err) {
        logger.warn("api.auth", `getUser attempt ${attempt + 1} failed`, {
          error: err instanceof Error ? err.message : String(err),
        })
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800))
      }
    }

    if (!user) {
      return apiError("Authentication required", "UNAUTHORIZED", 401)
    }

    try {
      return await handler(req, { user, supabase })
    } catch (err) {
      logger.error("api", "Unhandled route error", {
        path: req.nextUrl.pathname,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      return apiError("Internal server error", "INTERNAL_ERROR", 500)
    }
  }
}
