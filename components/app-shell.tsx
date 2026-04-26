"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Leaf, Home, MessageCircle, Utensils, Package, User, ShoppingBag, LogOut } from "lucide-react"
import { toast } from "sonner"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/pantry", label: "Pantry", icon: Package },
  { href: "/swiggy", label: "Swiggy", icon: ShoppingBag },
  { href: "/profile", label: "Profile", icon: User },
]

export function AppShell({
  children,
  userEmail,
  userName,
}: {
  children: React.ReactNode
  userEmail: string
  userName: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign out failed")
    }
  }

  const initials =
    (userName || userEmail || "U")
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground md:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="size-4" aria-hidden />
          </span>
          <span className="font-semibold">NutriAI</span>
        </div>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-sidebar-accent">
                <Avatar className="size-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{userName || "Your account"}</p>
                  <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="size-4" aria-hidden />
          </span>
          <span className="font-semibold">NutriAI</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account">
              <Avatar className="size-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{userName || userEmail}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background md:hidden"
      >
        {NAV.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
