"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

export default function SignUpPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()
    if (!trimmedName) {
      toast.error("Please enter your name.")
      return
    }
    if (!trimmedEmail || !/.+@.+\..+/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.")
      return
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          // After clicking the email link, Supabase sends the user to this
          // callback. The `confirm=1` flag tells the route handler to land
          // them on /auth/email-confirmed and require a fresh login.
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback?confirm=1&next=/auth/email-confirmed`,
          data: { full_name: trimmedName },
        },
      })
      if (error) throw error
      // If email confirmations are disabled, the user has a session immediately.
      if (data.session) {
        router.push("/onboarding")
        router.refresh()
      } else {
        router.push("/auth/sign-up-success")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign up"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start your personalized nutrition plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="full_name">Full name</FieldLabel>
              <Input
                id="full_name"
                name="full_name"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Spinner className="size-4" /> Creating…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </FieldGroup>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
