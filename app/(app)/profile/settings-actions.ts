"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { randomBytes } from "crypto"

/* ── Password constraints ── */
const PasswordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[a-z]/, "At least one lowercase letter")
  .regex(/[0-9]/, "At least one number")
  .regex(/[^A-Za-z0-9]/, "At least one special character")

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SettingsActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string; field?: string }
  | null

/* ── Change password ── */
export async function changePassword(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: "Not authenticated" }

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return { ok: false, error: first.message, field: first.path[0] as string }
  }

  // Verify current password by attempting sign-in
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })
  if (authError) return { ok: false, error: "Current password is incorrect", field: "currentPassword" }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (updateError) return { ok: false, error: updateError.message }

  return { ok: true, message: "Password updated successfully" }
}

/* ── Sign out ── */
export async function signOutAction(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}

/* ── Share chat (create public token) ── */
export async function shareChat(
  conversationId: string,
): Promise<{ ok: true; token: string; url: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  // Check ownership
  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!convo) return { ok: false, error: "Conversation not found" }

  // Check if already shared
  const { data: existing } = await supabase
    .from("shared_chats")
    .select("token")
    .eq("conversation_id", conversationId)
    .eq("is_active", true)
    .maybeSingle()

  if (existing) {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/shared/${existing.token}`
    return { ok: true, token: existing.token, url }
  }

  // Create new share token
  const token = randomBytes(16).toString("hex")
  const { error } = await supabase.from("shared_chats").insert({
    conversation_id: conversationId,
    user_id: user.id,
    token,
    is_active: true,
  })
  if (error) return { ok: false, error: error.message }

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/shared/${token}`
  return { ok: true, token, url }
}

/* ── Revoke shared link ── */
export async function revokeShare(
  conversationId: string,
): Promise<SettingsActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { error } = await supabase
    .from("shared_chats")
    .update({ is_active: false })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, message: "Share link revoked" }
}
