import { getStripeCustomerId, getStripeCustomer } from "@/lib/stripe"
import { flag } from "flags/next"

// Add new plans here
const defaultPlans = [
  {
    id: "FREE",
    priceId: undefined,
    messageLimit: 10,
  },
  {
    id: "PRO",
    priceId: "price_1R3aDvLxBMFKq9DZn1vkvwwW",
    messageLimit: 100,
  },
]

export const plansFlag = flag({
  key: "subscription-plans",
  // Provide other options to the Vercel Flags Explorer for testing
  options: [
    {
      label: "Default",
      value: defaultPlans,
    },
    {
      label: "Unlimited",
      value: [
        {
          id: "FREE",
          priceId: undefined,
          messageLimit: 100,
        },
        {
          id: "PRO",
          priceId: "price_1R3aDvLxBMFKq9DZn1vkvwwW",
          messageLimit: 1000
        },
      ],
    },
  ],
  decide() {
    return defaultPlans
  },
})

export async function getStripePlan(userId: string) {
  const plans = await plansFlag()
  const freePlan = plans.find((plan) => plan.priceId === undefined) ?? plans[0]

  const customerId = await getStripeCustomerId(userId)
  if (!customerId) {
    return freePlan
  }

  const subData = await getStripeCustomer(customerId)
  if (!subData || subData.status !== "active") {
    // Inactive subscriptions happen after canceling, once the billing period ends
    return freePlan
  }

  return plans.find((plan) => plan.priceId === subData.priceId) ?? freePlan
}
