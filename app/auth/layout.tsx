import Link from "next/link"
import { Leaf } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="size-4" aria-hidden />
            </span>
            <span className="font-semibold">NutriAI</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 md:py-16">{children}</main>
    </div>
  )
}
