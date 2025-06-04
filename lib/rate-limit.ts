import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "./redis"
import { getStripePlan } from "@/app/api/stripe/plans"

// Free plan rate limiter: 10 messages per day
const freeRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(10, "1 d", 10),
  analytics: true,
  prefix: "free_message_limit",
})

// TODO: sync with stripe/plans.ts
// Pro plan rate limiter: 50 messages per day
const proRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(50, "1 d", 50),
  analytics: true,
  prefix: "pro_message_limit",
})

// Function to check and consume rate limit tokens based on user's plan
export async function checkMessageRateLimit(userId: string) {
  const plan = await getStripePlan(userId)
  const rateLimit = plan.id === "PRO" ? proRateLimit : freeRateLimit
  return rateLimit.limit(userId)
}

// Function to get rate limit status without consuming tokens
export async function getRateLimitStatus(userId: string) {
  const plan = await getStripePlan(userId)
  const rateLimit = plan.id === "PRO" ? proRateLimit : freeRateLimit
  const result = await rateLimit.getRemaining(userId)
  
  return {
    remaining: result.remaining,
    reset: result.reset,
  }
}
