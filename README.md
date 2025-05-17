# NeonAuth with Stripe Integration

This project combines StackAuth authentication with Neon database and Stripe subscription management.

## Overview

- **Authentication**: Secure user authentication via StackAuth with NeonAuth integration
- **Database**: User data stored in Neon PostgreSQL
- **Payments**: Subscription management with Stripe
- **Features**: User profiles, theme customization, email management

## Setting Up on v0

### Step 1: Fork the Project

1. Click the "Fork" button in the v0 interface to create your own copy of this project
2. Give your project a name and description

### Step 2: Connect Neon Database

1. v0 will automatically prompt you to create or connect a Neon database
2. Follow the prompts to connect your Neon database to the project
3. All necessary environment variables will be automatically configured

### Step 3: Set Up NeonAuth in Neon Dashboard

1. After connecting your Neon database, go to the [Neon dashboard](https://console.neon.tech/)
2. Navigate to your project
3. In the sidebar, find and select "NeonAuth"
4. Follow the setup wizard to configure StackAuth:
   - Create a new StackAuth project if you don't have one
   - Connect your existing StackAuth project if you already have one
5. The NeonAuth setup will automatically:
   - Create the `neon_auth.users_sync` table
   - Configure the synchronization between StackAuth and your Neon database
   - Set up the necessary environment variables for StackAuth

### Step 4: Set Up Stripe

1. Create an account at [Stripe](https://stripe.com/)
2. Get your API keys from the Stripe dashboard
3. Add your Stripe secret key to the environment variables in v0:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
4. Create a product and price in the Stripe dashboard
5. Update the price ID in `app/api/stripe/plans.ts`

\`\`\`typescript
// In app/api/stripe/plans.ts
const defaultPlans = [
  {
    id: "FREE",
    priceId: undefined,
    // ...
  },
  {
    id: "PRO",
    priceId: "YOUR_PRICE_ID_HERE", // Replace with your Stripe price ID
    // ...
  },
]
\`\`\`

### Step 5: Register Stripe Webhook

After deploying your application, run the webhook registration script to set up Stripe webhooks:

\`\`\`bash
# Make sure your environment variables are set
npx tsx register-webhook.ts
\`\`\`

This will:
1. Register a webhook endpoint with Stripe
2. Configure it to listen for subscription events
3. Provide you with a webhook secret

Add the webhook secret to your environment variables as `STRIPE_WEBHOOK_SECRET`.

## Understanding NeonAuth

NeonAuth is a feature of Neon that integrates with StackAuth to:

1. Automatically sync user data from StackAuth to your Neon database
2. Create and maintain a `neon_auth.users_sync` table with user information
3. Allow you to join user data with your application tables

Example of querying user data:

\`\`\`sql
-- Get all active users
SELECT * FROM neon_auth.users_sync WHERE deleted_at IS NULL;

-- Join with application data
SELECT 
  t.*,
  u.id AS user_id,
  u.name AS user_name,
  u.email AS user_email
FROM 
  public.todos t
LEFT JOIN 
  neon_auth.users_sync u ON t.owner = u.id
WHERE 
  u.deleted_at IS NULL;
\`\`\`

## Local Development

For local development with Stripe webhooks, use the Stripe CLI:

\`\`\`bash
stripe listen --forward-to http://localhost:3000/api/stripe
\`\`\`

## Project Structure

- `/app`: Next.js App Router pages and components
- `/app/api`: API routes including Stripe webhook handler
- `/app/components`: Reusable UI components
- `/lib`: Utility functions and database client
- `/stack.ts`: StackAuth configuration

## Customization

### Modifying Subscription Plans

Edit the plans in `app/api/stripe/plans.ts` to change the available subscription tiers and their features.

## Stripe Webhook Setup

To enable Stripe webhooks for subscription management, you need to register a webhook endpoint with Stripe. This project includes a script to automate this process.

### Register Webhook

Run the following command to register a webhook with Stripe:

\`\`\`bash
# Make sure your Stripe secret key and deployment URL are set in your environment
npx tsx register-webhook.ts
\`\`\`

The script will:
1. Check if a webhook already exists for your URL
2. Create a new webhook or update an existing one
3. Configure it to listen for relevant subscription events
4. Provide you with a webhook secret

**Important:** Add the webhook secret to your environment variables.
