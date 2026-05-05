import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Serwist uses a webpack plugin for SW generation.
  // Tell Next.js 16 (which defaults to Turbopack) that we have a webpack config.
  // Setting turbopack: {} silences the Turbopack/webpack co-existence error.
  turbopack: {},
}

export default withSerwist(nextConfig)
