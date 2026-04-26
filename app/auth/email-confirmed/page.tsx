import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export default function EmailConfirmedPage() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex size-14 items-center justify-center rounded-full text-[oklch(0.55_0.16_150)]"
          style={{ background: "oklch(0.94 0.07 150)" }}
        >
          <CheckCircle2 className="size-7" aria-hidden />
        </div>
        <CardTitle className="text-2xl">Email confirmed</CardTitle>
        <CardDescription className="text-balance">
          Your email address has been verified. You can now sign in to start your personalized nutrition plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild className="w-full">
          <Link href="/auth/login">Continue to sign in</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
