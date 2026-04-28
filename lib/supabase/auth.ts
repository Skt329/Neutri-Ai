import { cache } from "react"
import { createClient } from "./server"

/**
 * Request-scoped cached auth helper.
 * React.cache ensures that within a single server render (layout + page),
 * getUser() is only called ONCE, no matter how many files import this.
 *
 * The middleware already refreshes session cookies, so this just reads
 * the validated session from cookies — NOT a fresh network round-trip
 * every time.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error, supabase }
})
