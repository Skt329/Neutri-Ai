import type { Metadata, Viewport } from "next"
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { PostHogProvider } from "@/components/posthog-provider"
import "./globals.css"

const fraunces = Fraunces({ subsets: ["latin"], weight: ["300", "400", "600", "700"], variable: "--font-serif" })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "NutriAI — Your AI Dietitian",
  description:
    "Personalized nutrition coaching powered by AI. Log meals, hit your macros, and build lasting habits with a dietitian in your pocket.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1E9" },
    { media: "(prefers-color-scheme: dark)", color: "#F6F1E9" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plusJakartaSans.variable} bg-background`}>
      <body className="font-sans antialiased">
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Toaster richColors closeButton />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
