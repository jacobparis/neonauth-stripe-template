"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, Package } from "lucide-react"
import { redirectToCheckout, redirectToBillingPortal } from "@/app/api/stripe/client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface SubscriptionCardProps {
  userId: string
  email: string
  name?: string | null
  plan: {
    id: string
  }
  subscription?: {
    status: string
    currentPeriodEnd?: number
    cancelAtPeriodEnd?: boolean
    paymentMethod?: {
      brand: string | null
      last4: string | null
    } | null
  } | null
}

export function SubscriptionCard({ userId, email, name, plan, subscription }: SubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isPro = plan.id === "PRO"
  const isActive = subscription?.status === "active"

  return (
    <div className={cn(isPro ? "col-span-2" : "rounded-lg border px-4 py-3 -my-3")}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-medium">Pro Plan</h2>
          {isPro ? <Badge>Active</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">Enhanced vibes and luck for power users</p>
      </div>

      {isPro ? (
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Vibes Meter</span>
              <span className="font-medium">Immaculate</span>
            </div>
            <Progress value={95} className="h-2" />
          </div>
        </div>
      ) : (
        <ul className="grid gap-2 text-sm mt-4">
          <li className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span>Enhanced vibes</span>
          </li>
          <li className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span>Increased luck</span>
          </li>
        </ul>
      )}

      <div className="mt-8 flex justify-end">
        {isPro ? (
          <form
            action={async () => {
              setIsLoading(true)
              try {
                await redirectToBillingPortal({ userId })
              } catch (error) {
                console.error("Error redirecting to billing portal:", error)
                setIsLoading(false)
              }
            }}
          >
            <Button type="submit" className="gap-2" disabled={isLoading}>
              {isLoading ? "Redirecting..." : "Manage Subscription"}
            </Button>
          </form>
        ) : (
          <form
            action={async () => {
              setIsLoading(true)
              try {
                await redirectToCheckout({ userId, email, name })
              } catch (error) {
                console.error("Error redirecting to checkout:", error)
                setIsLoading(false)
              }
            }}
          >
            <Button type="submit" className="gap-2" disabled={isLoading}>
              {isLoading ? "Redirecting..." : "Upgrade to Pro"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
