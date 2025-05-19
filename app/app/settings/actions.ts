"use server"

import { redirect } from "next/navigation"
import { stackServerApp } from "@/stack"
import { createStripeCustomer, getStripeCustomerId, stripe } from "@/lib/stripe"

export async function createCheckoutSession() {
  const user = await stackServerApp.getUser()
  if (!user) return { error: "Not authenticated" }

  // Get or create Stripe customer
  let customerId = await getStripeCustomerId(user.id)
  if (!customerId) {
    const customer = await createStripeCustomer({
      userId: user.id,
      email: user.primaryEmail || "",
      name: user.displayName,
    })
    customerId = customer.id
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: "price_1R3aDvLxBMFKq9DZn1vkvwwW", // Replace with your actual price ID
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_VERCEL_URL}/app/settings/account`,
    cancel_url: `${process.env.NEXT_PUBLIC_VERCEL_URL}/app/settings/account`,
  })

  if (!session.url) {
    throw new Error("Failed to create checkout session")
  }

  // Redirect to Stripe Checkout
  redirect(session.url)
}
