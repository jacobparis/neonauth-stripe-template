import { invariant } from "@epic-web/invariant"
import { config } from "dotenv"
import type Stripe from "stripe"
import { spawn } from "child_process"

config()

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
invariant(STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY is required")

const events: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]

console.log("🔄 Setting up Stripe webhook endpoint...")
const url = `https://${process.env.VERCEL_URL}/api/stripe`

if (!url.includes("localhost:")) {
  throw new Error("Running in production mode")
}
console.log("🔄 Running in local development mode")
console.log("🔄 Starting Stripe CLI webhook forwarder...")

const stripeProcess = spawn("stripe", ["listen", "--events", events.join(","), "--forward-to", url])

stripeProcess.stdout.on("data", (data) => {
  console.log(`${data}`)
  if (data.toString().includes("Ready!")) {
    console.log("✅ Stripe CLI webhook forwarder is ready")
  }
})

stripeProcess.stderr.on("data", (data) => {
  console.error(`${data}`)
})

stripeProcess.on("close", (code) => {
  if (code !== 0) {
    console.error(`❌ Stripe CLI webhook forwarder exited with code ${code}`)
    process.exit(1)
  }
})

// Keep the process running
process.on("SIGINT", () => {
  stripeProcess.kill()
  process.exit(0)
})
