import { cache } from "react"
import { getAuthUser } from "./auth"
import type { Profile } from "@/lib/types"

/**
 * Request-scoped cached profile fetch.
 * Deduplicates profile queries across layout.tsx and page.tsx in the same render.
 */
export const getProfile = cache(async () => {
  const { user, supabase } = await getAuthUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>()

  return data
})
