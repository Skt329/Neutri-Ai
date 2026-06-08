import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { RegisterSW } from "@/components/register-sw"
import "./globals.css"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://neutri.ai"),
  title: "NeutriAI — Your AI Dietitian",
  description:
    "Personalized nutrition coaching powered by AI. Log meals, hit your macros, and build lasting habits with a dietitian in your pocket.",
  generator: "v0.app",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NeutriAI — Your AI Dietitian",
    description: "Log meals through conversation. Get TDEE-based macro targets. Generate recipes from your pantry.",
    siteName: "NeutriAI",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeutriAI — Your AI Dietitian",
    description: "Chat with an AI dietitian that logs meals, tracks macros, and orders food — all through natural conversation.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NeutriAI",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#F6F1E9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster richColors closeButton />
          <PwaInstallPrompt />
          <RegisterSW />
          {process.env.NODE_ENV === "production" && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}

