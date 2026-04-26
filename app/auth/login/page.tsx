"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") ?? "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !/.+@.+\..+/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.")
      return
    }
    if (!password) {
      toast.error("Please enter your password.")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
      if (error) throw error
      router.push(next)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue with your nutrition coach.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Spinner className="size-4" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </FieldGroup>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
