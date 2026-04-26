import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MailCheck } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" aria-hidden />
          </div>
          <CardTitle>Check your email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-center">
          <p className="text-sm text-muted-foreground text-balance">
            We&apos;ve sent a confirmation link to your inbox. Open it to verify your account and continue to NutriAI.
          </p>
          <Button asChild variant="outline">
            <Link href="/auth/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
