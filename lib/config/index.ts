/**
 * Centralized application configuration.
 *
 * All environment variables are validated at import time.
 * Modules should import config values from here instead of
 * accessing process.env directly.
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue
}

// ── Supabase ─────────────────────────────────────────────────────────────

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** Only available server-side. */
  get serviceRoleKey(): string {
    return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  },
} as const

// ── AI Providers ─────────────────────────────────────────────────────────

export const aiConfig = {
  azure: {
    resourceName: optionalEnv('AZURE_RESOURCE_NAME'),
    apiKey: optionalEnv('AZURE_API_KEY'),
    deploymentName: optionalEnv('AZURE_DEPLOYMENT_NAME', 'gpt-4.1-mini'),
  },
  nim: {
    apiKey: optionalEnv('NIM_API_KEY'),
  },
} as const

// ── External APIs ────────────────────────────────────────────────────────

export const externalApiConfig = {
  usda: {
    get apiKey(): string {
      return requireEnv('USDA_API_KEY')
    },
    baseUrl: 'https://api.nal.usda.gov/fdc/v1',
    rateLimitPerHour: 900,
  },
  openFoodFacts: {
    baseUrl: 'https://world.openfoodfacts.org',
    userAgent: 'NeutriAI/1.0 (https://neutri.ai)',
  },
} as const

// ── Redis / Upstash ──────────────────────────────────────────────────────

export const redisConfig = {
  isConfigured:
    typeof process !== 'undefined' &&
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN,
} as const

// ── Application ──────────────────────────────────────────────────────────

export const appConfig = {
  siteUrl: optionalEnv('NEXT_PUBLIC_SITE_URL', 'https://neutri.ai'),
  appUrl: optionalEnv('NEXT_PUBLIC_APP_URL'),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  debug: !!process.env.DEBUG,
} as const

// ── Rate Limiting ────────────────────────────────────────────────────────

export const rateLimitConfig = {
  chat: { limit: 20, window: '1 m' as const },
  usda: { limit: 900, window: '1 h' as const },
  nutrition: { limit: 10, window: '1 m' as const },
} as const

// ── Cache TTLs (seconds) ─────────────────────────────────────────────────

export const cacheTTL = {
  profile: 300,
  targets: 300,
  dailyTotals: 120,
  streak: 600,
  memories: 600,
  nutritionCache: 30 * 24 * 3600, // 30 days
  tokenUsageDaily: 172800,         // 48 hours
  tokenUsageMonthly: 3024000,      // 35 days
} as const
