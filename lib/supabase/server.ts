import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // called from a Server Component — can be ignored with middleware refreshing sessions
        }
      },
    },
  })
}

/**
 * Service-role client for privileged server-side operations (tool-calls, webhooks).
 * NEVER import this into a Client Component.
 */
export function createAdminClient() {
  const { createClient: createAdmin } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js")
  return createAdmin(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
