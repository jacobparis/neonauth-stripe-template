'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, Package } from 'lucide-react'
import {
  redirectToCheckout,
  redirectToBillingPortal,
} from '@/app/api/stripe/client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface SubscriptionCardProps {
  userId: string
  email: string
  name?: string | null
  plan: {
    id: string
    messageLimit: number
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
  rateLimitStatus: {
    remaining: number
    reset: number
  }
}

export function SubscriptionCard({
  userId,
  email,
  name,
  plan,
  subscription,
  rateLimitStatus,
}: SubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isPro = plan.id === 'PRO'
  const isActive = subscription?.status === 'active'

  // Calculate message usage for progress bar
  const messageLimit = plan.messageLimit
  const messagesUsed = messageLimit - rateLimitStatus.remaining
  const usagePercentage = (messagesUsed / messageLimit) * 100

  return (
    <div
      className={cn(isPro ? 'col-span-2' : 'rounded-lg border px-4 py-3 -my-3')}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-medium">
            {isPro ? 'Pro Plan' : 'Free Plan'}
          </h2>
          {isPro ? <Badge>Active</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {isPro
            ? `Advanced features with ${messageLimit} messages per day`
            : `Basic features with ${messageLimit} messages per day`}
        </p>
      </div>

      <div className="space-y-4 mt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Messages Today</span>
            <span className="font-medium">
              {messagesUsed} / {messageLimit}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
        </div>
      </div>

      {!isPro && (
        <ul className="grid gap-2 text-sm mt-4">
          <li className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span>{messageLimit} messages per day</span>
          </li>
          <li className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span>Basic AI assistance</span>
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
                console.error('Error redirecting to billing portal:', error)
                setIsLoading(false)
              }
            }}
          >
            <Button type="submit" className="gap-2" disabled={isLoading}>
              {isLoading ? 'Redirecting...' : 'Manage Subscription'}
            </Button>
          </form>
        ) : (
          <form
            action={async () => {
              setIsLoading(true)
              try {
                await redirectToCheckout({ userId, email, name })
              } catch (error) {
                console.error('Error redirecting to checkout:', error)
                setIsLoading(false)
              }
            }}
          >
            <Button type="submit" className="gap-2" disabled={isLoading}>
              {isLoading ? 'Redirecting...' : 'Upgrade to Pro'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
