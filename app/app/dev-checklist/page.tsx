import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

export default function DevChecklistPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Integration Checklist</h1>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vercel</CardTitle>
            <CardDescription>
              Deploy your project to Vercel and set this environment variable to
              your deployment URL.
              <br />
              <br />
              It is needed
              <ul className="list-disc pl-5">
                <li>
                  It tells Stripe where to send webhooks, so your app knows when
                  a user has changed their plan.
                </li>
                <li>
                  It tells QStash where to send messages, so your app can run
                  background jobs like bulk operations.
                </li>
              </ul>
              <br />
              If you are developing in localhost, you can use{' '}
              <code className="bg-muted p-1 rounded-md">
                npx untun@latest tunnel http://localhost:3000
              </code>{' '}
              to get a public URL for this variable.
              <br />
              There's no easy way to do this in v0, so best bet is to deploy to
              Vercel and allow the production instance to catch webhooks and
              background jobs while you work in v0.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">
                Required Environment Variables
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vercel_url"
                    checked={!!process.env.VERCEL_URL}
                    disabled
                  />
                  <label
                    htmlFor="vercel_url"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    VERCEL_URL
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vercel_public_url"
                    checked={!!process.env.NEXT_PUBLIC_VERCEL_URL}
                    disabled
                  />
                  <label
                    htmlFor="vercel_public_url"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    NEXT_PUBLIC_VERCEL_URL
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Neon for data, NeonAuth for users</CardTitle>
            <CardDescription>
              Connect your project to Vercel/v0's Neon integration to get these
              automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">
                Required Environment Variables
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="database_url"
                    checked={!!process.env.DATABASE_URL}
                    disabled
                  />
                  <label
                    htmlFor="database_url"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    DATABASE_URL
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stack_project"
                    checked={!!process.env.NEXT_PUBLIC_STACK_PROJECT_ID}
                    disabled
                  />
                  <label
                    htmlFor="stack_project"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    NEXT_PUBLIC_STACK_PROJECT_ID
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stack_client"
                    checked={!!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT}
                    disabled
                  />
                  <label
                    htmlFor="stack_client"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stack_client_key"
                    checked={
                      !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
                    }
                    disabled
                  />
                  <label
                    htmlFor="stack_client_key"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stack_server"
                    checked={!!process.env.STACK_SECRET_SERVER_KEY}
                    disabled
                  />
                  <label
                    htmlFor="stack_server"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    STACK_SECRET_SERVER_KEY
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Upstash Redis for caching Stripe data, rate limiting, and QStash
              for background tasks
            </CardTitle>
            <CardDescription>
              The Upstash integration requires that you set up both Redis and
              QStash, but you can do that through the Upstash dashboard via the
              Vercel integration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">
                Required Environment Variables
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="kv_url"
                    checked={!!process.env.KV_URL}
                    disabled
                  />
                  <label
                    htmlFor="kv_url"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    KV_URL
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="kv_rest_url"
                    checked={!!process.env.KV_REST_API_URL}
                    disabled
                  />
                  <label
                    htmlFor="kv_rest_url"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    KV_REST_API_URL
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="kv_token"
                    checked={!!process.env.KV_REST_API_TOKEN}
                    disabled
                  />
                  <label
                    htmlFor="kv_token"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    KV_REST_API_TOKEN
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="kv_readonly"
                    checked={!!process.env.KV_REST_API_READ_ONLY_TOKEN}
                    disabled
                  />
                  <label
                    htmlFor="kv_readonly"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    KV_REST_API_READ_ONLY_TOKEN
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="qstash_url"
                    checked={!!process.env.QSTASH_URL}
                    disabled
                  />
                  <label
                    htmlFor="qstash_url"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    QSTASH_URL
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="qstash_token"
                    checked={!!process.env.QSTASH_TOKEN}
                    disabled
                  />
                  <label
                    htmlFor="qstash_token"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    QSTASH_TOKEN
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="qstash_current"
                    checked={!!process.env.QSTASH_CURRENT_SIGNING_KEY}
                    disabled
                  />
                  <label
                    htmlFor="qstash_current"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    QSTASH_CURRENT_SIGNING_KEY
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="qstash_next"
                    checked={!!process.env.QSTASH_NEXT_SIGNING_KEY}
                    disabled
                  />
                  <label
                    htmlFor="qstash_next"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    QSTASH_NEXT_SIGNING_KEY
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stripe for subscriptions</CardTitle>
            <CardDescription>
              Stripe does not have a nice Vercel integration, so you'll need to
              set that up separately. We interact with Stripe in 3 ways:
              <br />
              <br />
              <ul className="list-disc pl-5">
                <li>
                  User can click a button to open a checkout page for a new
                  subscription.
                </li>
                <li>
                  User can click a button to open a portal to update their
                  subscription.
                </li>
                <li>
                  We receive webhooks from Stripe on many events, at which point
                  we write the latest state into Redis. All queries for
                  subscription status in-app are handled via Redis to avoid
                  Stripe's rate limits, slow latency, and inconsistent webhook
                  state.
                </li>
              </ul>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">
                Required Environment Variables
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stripe_secret"
                    checked={!!process.env.STRIPE_SECRET_KEY}
                    disabled
                  />
                  <label
                    htmlFor="stripe_secret"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    STRIPE_SECRET_KEY
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stripe_webhook"
                    checked={!!process.env.STRIPE_WEBHOOK_SECRET}
                    disabled
                  />
                  <label
                    htmlFor="stripe_webhook"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    STRIPE_WEBHOOK_SECRET
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
