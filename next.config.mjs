import withSerwistInit from '@serwist/next'
import { withSentryConfig } from '@sentry/nextjs'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.openfoodfacts.org' },
      { protocol: 'https', hostname: 'world.openfoodfacts.org' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  // Serwist uses a webpack plugin for SW generation.
  // Tell Next.js 16 (which defaults to Turbopack) that we have a webpack config.
  // Setting turbopack: {} silences the Turbopack/webpack co-existence error.
  turbopack: {},
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ]
  },
}

// Stack: Serwist (PWA) → Sentry (error tracking) → Next.js
export default withSentryConfig(withSerwist(nextConfig), {
  // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set
  silent: true,

  // Don't widen the existing webpack config — Sentry's plugin hooks into it
  disableLogger: true,

  // Upload source maps for better stack traces in production
  // Requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars
  widenClientFileUpload: true,

  // Hide source maps from end users
  hideSourceMaps: true,

  // Automatically instrument API routes and server components
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,
})
