'use server'

import Stripe from 'stripe'

export async function registerStripeWebhook() {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    const VERCEL_URL = process.env.VERCEL_URL

    if (!STRIPE_SECRET_KEY) {
      return {
        success: false,
        error: 'STRIPE_SECRET_KEY is required',
      }
    }

    if (!VERCEL_URL) {
      return {
        success: false,
        error: 'VERCEL_URL is required',
      }
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil',
    })

    // Define the events to listen for (same as in stripe.dev.ts)
    const events = [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'customer.subscription.paused',
      'customer.subscription.resumed',
      'customer.subscription.pending_update_applied',
      'customer.subscription.pending_update_expired',
      'customer.subscription.trial_will_end',
      'invoice.paid',
      'invoice.payment_failed',
      'invoice.payment_action_required',
      'invoice.upcoming',
      'invoice.marked_uncollectible',
      'invoice.payment_succeeded',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
    ]

    // Construct the webhook URL with https:// prefix
    const webhookUrl = VERCEL_URL.startsWith('http')
      ? `${VERCEL_URL}/api/stripe`
      : `https://${VERCEL_URL}/api/stripe`

    console.log(`🔄 Registering Stripe webhook for ${webhookUrl}...`)

    // First, list existing webhooks to avoid duplicates
    const existingEndpoints = await stripe.webhookEndpoints.list()

    // Check if we already have a webhook for this URL
    const existingEndpoint = existingEndpoints.data.find(
      (endpoint) => endpoint.url === webhookUrl,
    )

    let result

    if (existingEndpoint) {
      console.log(`ℹ️ Webhook already exists for ${webhookUrl}`)
      console.log(`ℹ️ Webhook ID: ${existingEndpoint.id}`)
      console.log(
        `ℹ️ Updating webhook to ensure it has the correct event types...`,
      )

      // Update the existing webhook with the current event types
      result = await stripe.webhookEndpoints.update(existingEndpoint.id, {
        enabled_events: events,
      })

      console.log(`✅ Webhook updated successfully!`)

      return {
        success: true,
        message: 'Webhook updated successfully!',
        webhookId: result.id,
        webhookSecret: 'Existing webhook secret preserved',
        isUpdate: true,
      }
    } else {
      // Create a new webhook endpoint
      result = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: events,
        description: `Webhook for ${VERCEL_URL}`,
      })

      console.log(`✅ Webhook registered successfully!`)
      console.log(`ℹ️ Webhook ID: ${result.id}`)
      console.log(`ℹ️ Webhook Secret: ${result.secret}`)

      return {
        success: true,
        message: 'Webhook registered successfully!',
        webhookId: result.id,
        webhookSecret: result.secret,
        isUpdate: false,
      }
    }
  } catch (error) {
    console.error('Error registering webhook:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
