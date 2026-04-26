import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShoppingBag, Link2, MessageCircle } from "lucide-react"
import { getSwiggyAdapter } from "@/lib/swiggy/adapter"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function SwiggyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const adapter = getSwiggyAdapter()
  const status = await adapter.getConnectionStatus(user.id)

  return (
    <>
      <PageHeader
        title="Swiggy"
        description="Order meals that fit your remaining macros, without leaving NutriAI."
      />
      <div className="flex flex-col gap-4 p-4 md:p-8">
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

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="size-5" aria-hidden />
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
              <p className="text-sm text-muted-foreground">
                Ask NutriAI in chat to find meals that match your remaining macros, and we&apos;ll queue the Swiggy
                order for you to approve.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect your Swiggy account to order directly from chat. Your AI dietitian will filter menus by your
                allergies and remaining macros.
              </p>
            )}
            <div className="flex gap-2">
              <Button asChild disabled={!adapter.isConfigured}>
                <Link href="/chat">
                  <MessageCircle className="mr-2 size-4" /> Plan an order in chat
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
