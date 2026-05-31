/**
 * Swiggy OAuth 2.1 + PKCE token management.
 *
 * Handles PKCE challenge generation, token exchange, encrypted storage
 * in Supabase, and expiry checks for proactive renewal notifications.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { randomBytes, createCipheriv, createDecipheriv } from "crypto"
import { logger } from "@/lib/logger"

// ── Constants ────────────────────────────────────────────────────────────────

const SWIGGY_AUTH_BASE = "https://mcp.swiggy.com"
const TOKEN_ENDPOINT = `${SWIGGY_AUTH_BASE}/auth/token`
const AUTHORIZE_ENDPOINT = `${SWIGGY_AUTH_BASE}/auth/authorize`

/** Encryption key from env — must be 32 bytes hex (64 chars). */
function getEncryptionKey(): Buffer {
  const hex = process.env.SWIGGY_TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      "SWIGGY_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    )
  }
  return Buffer.from(hex, "hex")
}

// ── PKCE ─────────────────────────────────────────────────────────────────────

export interface PKCEPair {
  codeVerifier: string
  codeChallenge: string
}

/**
 * Generate a PKCE code_verifier and S256 code_challenge.
 * Uses Web Crypto (available in Node 18+ and Edge runtimes).
 */
export async function generatePKCE(): Promise<PKCEPair> {
  // 32 bytes → 43-char base64url verifier (meets RFC 7636 min 43 chars)
  const verifierBytes = randomBytes(32)
  const codeVerifier = base64url(verifierBytes)

  // S256: SHA-256 hash of the verifier, base64url-encoded
  const hashBuffer = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  )
  const codeChallenge = base64url(Buffer.from(hashBuffer))

  return { codeVerifier, codeChallenge }
}

/** Build the full Swiggy OAuth authorize URL. */
export function buildAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  scopes?: string[]
}): { url: string; state: string } {
  const url = new URL(AUTHORIZE_ENDPOINT)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", params.clientId)
  url.searchParams.set("redirect_uri", params.redirectUri)
  url.searchParams.set("code_challenge", params.codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("scope", "mcp:tools")
  // Generate a random state param for CSRF protection
  const state = randomBytes(16).toString("hex")
  url.searchParams.set("state", state)
  return { url: url.toString(), state }
}

// ── Token Exchange ───────────────────────────────────────────────────────────

interface SwiggyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number // seconds
  scope?: string
}

/**
 * Exchange an authorization code for an access token.
 * This completes the OAuth 2.1 + PKCE flow.
 */
export async function exchangeCodeForToken(params: {
  code: string
  codeVerifier: string
  clientId: string
  redirectUri: string
}): Promise<SwiggyTokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.codeVerifier,
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Swiggy token exchange failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<SwiggyTokenResponse>
}

// ── Encrypted Storage ────────────────────────────────────────────────────────

/**
 * Store (or upsert) an encrypted Swiggy token for a user.
 */
export async function storeToken(
  supabase: SupabaseClient,
  userId: string,
  tokenData: SwiggyTokenResponse,
): Promise<void> {
  let encrypted: string
  try {
    encrypted = encrypt(tokenData.access_token)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to encrypt Swiggy access token: ${msg}`)
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
  const scopes = tokenData.scope?.split(" ") ?? ["food", "instamart"]

  const { error } = await supabase.from("swiggy_tokens").upsert(
    {
      user_id: userId,
      access_token_enc: encrypted,
      token_type: tokenData.token_type,
      expires_at: expiresAt,
      scopes,
    },
    { onConflict: "user_id" },
  )

  if (error) throw new Error(`Failed to store Swiggy token: ${error.message}`)
}

/**
 * Retrieve a valid (non-expired) access token for the user.
 * Returns null if no token exists or it's expired.
 */
export async function getValidToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("swiggy_tokens")
    .select("access_token_enc, expires_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) return null

  const expiresAt = new Date(data.expires_at)
  if (expiresAt <= new Date()) return null // expired

  try {
    return decrypt(data.access_token_enc)
  } catch (err) {
    logger.warn("swiggy.token", "Failed to decrypt Swiggy access token")
    return null
  }
}

/**
 * Check connection status for a user.
 */
export async function getSwiggyConnectionStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  connected: boolean
  expiresAt: string | null
  expiringSoon: boolean
  scopes: string[]
}> {
  const { data, error } = await supabase
    .from("swiggy_tokens")
    .select("expires_at, scopes")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) {
    return { connected: false, expiresAt: null, expiringSoon: false, scopes: [] }
  }

  const expiresAt = new Date(data.expires_at)
  const now = new Date()

  if (expiresAt <= now) {
    return { connected: false, expiresAt: null, expiringSoon: false, scopes: [] }
  }

  const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

  return {
    connected: true,
    expiresAt: data.expires_at,
    expiringSoon: hoursRemaining < 24,
    scopes: data.scopes ?? [],
  }
}

/**
 * Revoke / disconnect Swiggy for a user.
 */
export async function revokeToken(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.from("swiggy_tokens").delete().eq("user_id", userId)
  if (error) throw new Error(`Failed to revoke Swiggy token: ${error.message}`)
}

// ── AES-256-GCM Encryption Helpers ───────────────────────────────────────────

function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // Encode as: iv (12) + tag (16) + ciphertext → base64
  return Buffer.concat([iv, tag, encrypted]).toString("base64")
}

function decrypt(encoded: string): string {
  const key = getEncryptionKey()
  const buf = Buffer.from(encoded, "base64")
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final("utf8")
}

// ── Utility ──────────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
