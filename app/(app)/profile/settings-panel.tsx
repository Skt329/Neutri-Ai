"use client"

import { useState, useActionState, useEffect, useCallback } from "react"
import { useFormStatus } from "react-dom"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Lock,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Check,
  X,
  Eye,
  EyeOff,
  Shield,
  Link2,
  Unlink,
  AlertTriangle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  changePassword,
  signOutAction,
  type SettingsActionState,
} from "./settings-actions"
import { cn } from "@/lib/utils"

/* ── Password constraint rules ── */
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const

export function SettingsPanel({ userEmail }: { userEmail: string }) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <AccountSection userEmail={userEmail} />
      <AppearanceSection />
      <SwiggyConnectionSection />
      <SignOutSection />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   ACCOUNT SECTION — Password Change
   ════════════════════════════════════════════════════════════════ */

function AccountSection({ userEmail }: { userEmail: string }) {
  const [state, action] = useActionState<SettingsActionState, FormData>(
    changePassword,
    null,
  )
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0
  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(newPassword))
  const canSubmit = allRulesPassed && passwordsMatch

  useEffect(() => {
    if (state && "ok" in state) {
      if (state.ok) {
        toast.success(state.message || "Password updated")
        setIsEditing(false)
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(state.error)
      }
    }
  }, [state])

  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-sage/10">
          <Shield className="size-5 text-sage" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">Account</h3>
          <p className="text-[11px] text-stone">{userEmail}</p>
        </div>
      </div>

      {!isEditing ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="gap-2 text-xs border-border text-stone hover:text-ink hover:border-sage/40"
        >
          <Lock className="size-3.5" />
          Change password
        </Button>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="bg-cream2/50 border-cream3 focus:border-sage pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fog hover:text-stone smooth-hover"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-cream2/50 border-cream3 focus:border-sage pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fog hover:text-stone smooth-hover"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {/* Password strength indicators */}
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1 animate-fade-in">
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(newPassword)
                    return (
                      <div
                        key={rule.label}
                        className={cn(
                          "flex items-center gap-2 text-[11px] smooth-hover",
                          passed ? "text-sage" : "text-fog",
                        )}
                      >
                        {passed ? (
                          <Check className="size-3 shrink-0" />
                        ) : (
                          <X className="size-3 shrink-0" />
                        )}
                        {rule.label}
                      </div>
                    )
                  })}
                </div>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    "bg-cream2/50 border-cream3 focus:border-sage pr-10",
                    confirmPassword.length > 0 && !passwordsMatch && "border-clay/50 focus:border-clay",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fog hover:text-stone smooth-hover"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <FieldDescription className="text-clay text-[11px]">
                  Passwords do not match
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false)
                setNewPassword("")
                setConfirmPassword("")
              }}
            >
              Cancel
            </Button>
            <PasswordSubmitButton disabled={!canSubmit} />
          </div>
        </form>
      )}
    </section>
  )
}

function PasswordSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      size="sm"
      disabled={disabled || pending}
      className="bg-forest hover:bg-sage text-white gap-1.5"
    >
      {pending ? (
        <>
          <Spinner className="size-3.5" /> Updating…
        </>
      ) : (
        <>
          <Lock className="size-3.5" /> Update password
        </>
      )}
    </Button>
  )
}

/* ════════════════════════════════════════════════════════════════
   APPEARANCE SECTION — Theme Toggle
   ════════════════════════════════════════════════════════════════ */

function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const

  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-turmeric/10">
          <Sun className="size-5 text-turmeric" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">Appearance</h3>
          <p className="text-[11px] text-stone">
            Choose your preferred theme. Saved automatically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {themes.map(({ value, label, icon: Icon }) => {
          const isActive = mounted && theme === value
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 smooth-hover",
                isActive
                  ? "border-sage/50 bg-sage/5 text-sage shadow-sm ring-1 ring-sage/10"
                  : "border-border bg-cream2/30 text-stone hover:border-sage/30 hover:text-ink",
              )}
              aria-pressed={isActive}
            >
              <Icon className={cn("size-5", isActive && "animate-scale-up")} />
              <span className="text-xs font-medium">{label}</span>
              {isActive && (
                <div className="flex size-4 items-center justify-center rounded-full bg-sage text-white animate-scale-up">
                  <Check className="size-2.5" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   SWIGGY CONNECTION SECTION
   ════════════════════════════════════════════════════════════════ */

const IS_DEV = process.env.NODE_ENV === "development"

function SwiggyConnectionSection() {
  const [status, setStatus] = useState<{
    connected: boolean
    expiresAt: string | null
    expiringSoon: boolean
    scopes: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState(false)

  useEffect(() => {
    fetch("/api/swiggy/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false, expiresAt: null, expiringSoon: false, scopes: [] }))
      .finally(() => setLoading(false))
  }, [])

  const handleConnect = useCallback(async () => {
    setActionPending(true)
    try {
      const res = await fetch("/api/swiggy/connect", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to start Swiggy connection")
        setActionPending(false)
      }
    } catch {
      toast.error("Failed to connect to Swiggy")
      setActionPending(false)
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    setActionPending(true)
    try {
      const res = await fetch("/api/swiggy/disconnect", { method: "POST" })
      const data = await res.json()
      if (data.ok) {
        setStatus({ connected: false, expiresAt: null, expiringSoon: false, scopes: [] })
        toast.success("Swiggy disconnected")
      } else {
        toast.error(data.error || "Failed to disconnect")
      }
    } catch {
      toast.error("Failed to disconnect Swiggy")
    } finally {
      setActionPending(false)
    }
  }, [])

  const expiresLabel = status?.expiresAt
    ? `Expires ${new Date(status.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : null

  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#fc8019]/10">
          <svg className="size-5" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#fc8019" />
            <text x="6" y="16" fontSize="10" fill="white" fontWeight="bold">S</text>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-ink">Swiggy</h3>
            {!loading && (
              <Badge
                variant={status?.connected ? "default" : "outline"}
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  status?.connected
                    ? "bg-sage/15 text-sage border-sage/30"
                    : "text-stone border-border",
                )}
              >
                {status?.connected ? "Connected" : "Not connected"}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-turmeric/40 text-turmeric bg-turmeric/5"
            >
              Under Development
            </Badge>
          </div>
          <p className="text-[11px] text-stone">
            Order food & groceries with nutrition tracking
          </p>
        </div>
      </div>

      {status?.connected && status.expiringSoon && (
        <div className="flex items-center gap-2 mb-4 rounded-lg bg-turmeric/10 border border-turmeric/20 px-3 py-2">
          <AlertTriangle className="size-3.5 text-turmeric shrink-0" />
          <p className="text-[11px] text-turmeric">
            Connection expires soon. Reconnect to continue ordering.
          </p>
        </div>
      )}

      {!IS_DEV && !status?.connected && (
        <div className="flex items-center gap-2 mb-4 rounded-lg bg-turmeric/10 border border-turmeric/20 px-3 py-2">
          <AlertTriangle className="size-3.5 text-turmeric shrink-0" />
          <p className="text-[11px] text-turmeric">
            Swiggy integration is under active development and not yet available in production.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[11px] text-stone">
          {status?.connected && expiresLabel ? expiresLabel : "Connect your Swiggy account to order food and groceries from chat."}
        </div>
        {loading ? (
          <Spinner className="size-4" />
        ) : status?.connected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={actionPending}
            className="gap-2 text-xs border-clay/30 text-clay hover:bg-clay/5"
          >
            {actionPending ? <Spinner className="size-3.5" /> : <Unlink className="size-3.5" />}
            Disconnect
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={IS_DEV ? handleConnect : undefined}
            disabled={actionPending || !IS_DEV}
            className={cn(
              "gap-2 text-xs",
              IS_DEV
                ? "border-sage/40 text-sage hover:bg-sage/5 hover:text-sage"
                : "border-border text-fog cursor-not-allowed opacity-60",
            )}
          >
            {actionPending ? <Spinner className="size-3.5" /> : <Link2 className="size-3.5" />}
            {IS_DEV ? "Connect Swiggy" : "Coming Soon"}
          </Button>
        )}
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   SIGN OUT SECTION
   ════════════════════════════════════════════════════════════════ */

function SignOutSection() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const handleSignOut = useCallback(async () => {
    setPending(true)
    const result = await signOutAction()
    // signOutAction redirects on success; only reaches here on error
    if (result && !result.ok) {
      toast.error(result.error)
      setPending(false)
    }
  }, [])

  return (
    <section className="bg-card rounded-2xl border border-clay/20 p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-clay/10">
            <LogOut className="size-5 text-clay" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Sign out</h3>
            <p className="text-[11px] text-stone">
              End your session on this device.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className="gap-2 text-xs border-clay/30 text-clay hover:bg-clay/5 hover:text-clay"
        >
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              disabled={pending}
              className="bg-clay hover:bg-clay/90 text-white"
            >
              {pending ? (
                <>
                  <Spinner className="size-4 mr-1" /> Signing out…
                </>
              ) : (
                "Sign out"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
