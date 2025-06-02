import { stackServerApp } from '@/stack'
import { AccountPageClient } from './page-client'
import { getStripeCustomerId, getStripeCustomer } from '@/lib/stripe'
import { getStripePlan } from '@/app/api/stripe/plans'
import { getRateLimitStatus } from '@/lib/rate-limit'

export default async function AccountPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' })

  const contactChannels = await user?.listContactChannels()

  // Get subscription data and rate limit status
  const [customerId, plan, rateLimitStatus] = await Promise.all([
    getStripeCustomerId(user.id),
    getStripePlan(user.id),
    getRateLimitStatus(user.id),
  ])

  const subscription = customerId ? await getStripeCustomer(customerId) : null

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      <AccountPageClient
        contactChannels={
          contactChannels?.map((channel) => ({
            id: channel.id,
            value: channel.value,
            type: channel.type,
            isPrimary: channel.isPrimary,
            isVerified: channel.isVerified,
            usedForAuth: channel.usedForAuth,
          })) ?? []
        }
        subscription={subscription}
        plan={plan}
        rateLimitStatus={rateLimitStatus}
        userId={user.id}
        email={user.primaryEmail || ''}
        name={user.displayName}
      />
    </div>
  )
}
