import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShoppingBag, Link2, MessageCircle } from "lucide-react"
import { getSwiggyAdapter } from "@/lib/swiggy/adapter"
import { getAuthUser } from "@/lib/supabase/auth"

export const metadata = {
  title: "Swiggy — NutriAI",
  description: "Order meals that fit your macros directly from Swiggy, powered by NutriAI.",
}

export const dynamic = "force-dynamic"

export default async function SwiggyPage() {
  const { user } = await getAuthUser()
  if (!user) return null

  const adapter = getSwiggyAdapter()
  const status = await adapter.getConnectionStatus(user.id)

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="font-display text-3xl font-bold text-ink">Swiggy</h1>
        <p className="text-stone text-sm mt-1">
          Order meals that fit your remaining macros, without leaving NutriAI.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {!adapter.isConfigured ? (
          <Alert>
            <Link2 className="size-4" />
            <AlertTitle>Swiggy integration not configured</AlertTitle>
            <AlertDescription>
              Your server doesn&apos;t have a Swiggy adapter wired up yet. Once an API or MCP is available, the
              ordering flow in chat and this page will light up automatically.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-mint2 text-sage">
              <ShoppingBag className="size-5" />
            </span>
            <div>
              <CardTitle>Connection</CardTitle>
              <CardDescription>
                {status.connected
                  ? `Connected${status.account_id ? ` (account ${status.account_id})` : ""}`
                  : "Not connected"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {status.connected ? (
              <p className="text-sm text-stone">
                Ask NutriAI in chat to find meals that match your remaining macros, and we&apos;ll queue the Swiggy
                order for you to approve.
              </p>
            ) : (
              <p className="text-sm text-stone">
                Connect your Swiggy account to order directly from chat. Your AI dietitian will filter menus by your
                allergies and remaining macros.
              </p>
            )}
            <div className="flex gap-2">
              <Button asChild disabled={!adapter.isConfigured} className="bg-forest hover:bg-sage text-white rounded-full">
                <Link href="/chat">
                  <MessageCircle className="mr-2 size-4" /> Plan an order in chat
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
