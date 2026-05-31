import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client for privileged, server-only background work
 * (embedding writes, memory extraction, webhooks). Never import this
 * into a component or route that is reachable by the user without
 * first re-authorizing on user_id.
 *
 * Uses a lazy singleton — the client is created once on first call
 * and reused for subsequent calls within the same process lifetime.
 */

let _adminClient: ReturnType<typeof createSupabaseClient> | null = null

export function createAdminClient() {
  if (_adminClient) return _adminClient

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. These are required for server-side background work.",
    )
  }

  _adminClient = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return _adminClient
}
