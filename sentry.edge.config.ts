import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  tracesSampleRate: 0.1,

  sendDefaultPii: false,

  release: process.env.npm_package_version ?? "0.1.0",
  environment: process.env.NODE_ENV ?? "development",
})
