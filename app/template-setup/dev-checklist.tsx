import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StripeWebhookForm } from './stripe-webhook-form'
import {
  checkMigrations,
  runMigrations,
  resetDatabase,
  configureRLS,
  configureJWKS,
} from './actions'

// First, let's create a reusable CSS class for environment variables
function EnvVar({ name, exists }: { name: string; exists: boolean }) {
  return (
    <p className={`font-medium font-mono ${!exists ? 'text-gray-500' : ''}`}>
      {name}
    </p>
  )
}

export async function DevChecklistPage() {
  const tablesStatus = await checkMigrations()
  const migrationsRun =
    tablesStatus.tables.todos && tablesStatus.tables.users_sync

  // Check which essential environment variables are missing
  const essentialVars = {
    database: !!process.env.DATABASE_URL,
    stackProjectId: !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    stackPublishableKey: !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    stackServerKey: !!process.env.STACK_SECRET_SERVER_KEY,
  }

  // Calculate progress percentage
  const totalSteps = 10 // Total number of environment variables and migrations we're checking
  const completedSteps = [
    !!process.env.DATABASE_URL,
    !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    !!process.env.STACK_SECRET_SERVER_KEY,
    !!process.env.VERCEL_URL,
    !!process.env.NEXT_PUBLIC_VERCEL_URL,
    !!process.env.VERCEL_OIDC_TOKEN,
    !!process.env.XAI_API_KEY,
    !!process.env.KV_URL,
    !!process.env.KV_REST_API_TOKEN,
    !!process.env.KV_REST_API_READ_ONLY_TOKEN,
    !!process.env.STRIPE_SECRET_KEY,
    !!process.env.STRIPE_WEBHOOK_SECRET,
    migrationsRun,
  ].filter(Boolean).length

  const progressPercentage = Math.round((completedSteps / totalSteps) * 100)
  const isComplete = completedSteps === totalSteps

  // Check if we can register Stripe webhook
  const canRegisterWebhook =
    !!process.env.STRIPE_SECRET_KEY && !!process.env.VERCEL_URL

  // Check if any table is missing RLS enabled or a policy
  const needsRLS = ['todos', 'users_sync'].some(
    (table) =>
      !tablesStatus.rls.tables?.[table]?.rlsEnabled ||
      !tablesStatus.rls.tables?.[table]?.hasPolicy,
  )

  return (
    <div>
      {/* Cleanup Instructions - only show when complete */}
      {isComplete ? (
        <section className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 mb-8">
          <div className="flex">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-800">Setup Complete!</h3>
              <ol className="mt-4 space-y-2 text-sm text-green-700 list-decimal pl-5">
                <li>
                  Delete the{' '}
                  <code className="bg-green-100 px-1.5 py-0.5 rounded text-green-800">
                    app/template-setup
                  </code>{' '}
                  directory
                </li>
                <li>Replace this page with your own homepage</li>
              </ol>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-8 rounded-lg border border-neutral-200 p-6 mb-8">
          <div className="flex">
            <div>
              <h3 className="font-semibold text-neutral-800">
                <span className="text-gray-600">
                  {completedSteps}/{totalSteps}
                </span>{' '}
                steps complete
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-neutral-700 list-disc pl-5">
                <li>
                  Follow the steps below to set up the integrations your project
                  will need.
                </li>
                <li>
                  Then delete this page and replace it with your own homepage.
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      <div className="space-y-8">
        {/* Neon Integration Section (Database + Auth) */}
        <section className="rounded-lg border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-gray-200 mr-2">
              <img
                src="https://vercel.com/api/www/avatar/f3f5c58cf14f239dd686ee96fee64e842c70bbfb?s=72"
                alt="Neon Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Neon + NeonAuth
              </h3>
              <p className="text-sm text-gray-600">
                The database stores your users and data. NeonAuth is built on
                top of StackAuth, which is an open source auth service that
                allows both password and social logins.
              </p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-start">
                {essentialVars.database ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <div className="flex items-center">
                    <EnvVar
                      name="DATABASE_URL"
                      exists={essentialVars.database}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                {essentialVars.stackProjectId ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <div className="flex items-center">
                    <EnvVar
                      name="NEXT_PUBLIC_STACK_PROJECT_ID"
                      exists={essentialVars.stackProjectId}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                {essentialVars.stackPublishableKey ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <div className="flex items-center">
                    <EnvVar
                      name="NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY"
                      exists={essentialVars.stackPublishableKey}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                {essentialVars.stackServerKey ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <div className="flex items-center">
                    <EnvVar
                      name="STACK_SECRET_SERVER_KEY"
                      exists={essentialVars.stackServerKey}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="https://vercel.com/integrations/neon"
                target="_blank"
                className="inline-flex items-center text-sm font-medium text-black hover:underline mr-2"
              >
                Enable Neon Integration
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
              <Link
                href="https://neon.tech/docs/guides/neon-auth"
                target="_blank"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mr-2"
              >
                NeonAuth documentation
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Upstash Redis Section */}
        <section className="rounded-lg border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-gray-200 mr-2">
              <img
                src="https://vercel.com/api/www/avatar/cfffdb788d0e6372f30572554f6e82fb45d4792a?s=72"
                alt="Upstash Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Upstash Redis
              </h3>
              <p className="text-sm text-gray-600">
                Redis stores Stripe subscription data for fast access
              </p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-start">
                {!!process.env.KV_URL ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar name="KV_URL" exists={!!process.env.KV_URL} />
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.KV_REST_API_TOKEN ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="KV_REST_API_TOKEN"
                    exists={!!process.env.KV_REST_API_TOKEN}
                  />
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.KV_REST_API_READ_ONLY_TOKEN ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="KV_REST_API_READ_ONLY_TOKEN"
                    exists={!!process.env.KV_REST_API_READ_ONLY_TOKEN}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="https://vercel.com/integrations/upstash"
                target="_blank"
                className="inline-flex items-center text-sm font-medium text-black hover:underline mr-2"
              >
                Enable Upstash Integration
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
              <Link
                href="https://upstash.com/docs/redis/overall/getstarted"
                target="_blank"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
              >
                Redis documentation
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Database Migrations Section */}
        <section className="rounded-lg border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-gray-200 mr-2">
              <img
                src="https://vercel.com/api/www/avatar/f3f5c58cf14f239dd686ee96fee64e842c70bbfb?s=72"
                alt="Neon Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Database Tables
              </h3>
              <p className="text-sm text-gray-600">
                Run the migrations to set up the database. Optionally, you can
                enable Row Level Security.{' '}
              </p>
            </div>
          </div>
          <div className="p-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start">
                {tablesStatus.tables.todos ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      !tablesStatus.tables.todos ? 'text-gray-500' : ''
                    }`}
                  >
                    Todos Table
                  </p>
                  <div className="flex gap-2 text-xs mt-1">
                    {tablesStatus.rls.tables?.todos?.rlsEnabled ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 align-text-bottom" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.todos?.rlsEnabled
                          ? 'text-red-500'
                          : ''
                      }
                    >
                      RLS enabled
                    </span>
                    {tablesStatus.rls.tables?.todos?.hasPolicy ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom ml-2" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 align-text-bottom ml-2" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.todos?.hasPolicy
                          ? 'text-red-500'
                          : ''
                      }
                    >
                      Policy present
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                {tablesStatus.tables.users_sync ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      !tablesStatus.tables.users_sync ? 'text-gray-500' : ''
                    }`}
                  >
                    Users Sync Table
                  </p>
                  <div className="flex gap-2 text-xs mt-1">
                    {tablesStatus.rls.tables?.users_sync?.rlsEnabled ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 align-text-bottom" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.users_sync?.rlsEnabled
                          ? 'text-red-500'
                          : ''
                      }
                    >
                      RLS enabled
                    </span>
                    {tablesStatus.rls.tables?.users_sync?.hasPolicy ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom ml-2" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 align-text-bottom ml-2" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.users_sync?.hasPolicy
                          ? 'text-red-500'
                          : ''
                      }
                    >
                      Policy present
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                {tablesStatus.jwks ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      !tablesStatus.jwks ? 'text-gray-500' : ''
                    }`}
                  >
                    StackAuth JWKS
                  </p>
                  <>
                    {tablesStatus.jwksList &&
                      tablesStatus.jwksList.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {tablesStatus.jwksList.map(
                            (jwks: { jwks_url: string }, index: number) => (
                              <div
                                key={index}
                                className="bg-gray-50 p-2 rounded"
                              >
                                <p className="text-xs font-mono break-all">
                                  {jwks.jwks_url}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                  </>
                </div>
              </div>

              <div className="flex items-start mt-6 mb-4">
                {!!process.env.NEON_API_KEY ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="NEON_API_KEY"
                    exists={!!process.env.NEON_API_KEY}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Only required if you want to enable Row Level Security for
                    your tables. Get it from your{' '}
                    <a
                      href="https://console.neon.tech/app/settings/api-keys"
                      target="_blank"
                      className="text-black underline hover:no-underline"
                    >
                      Neon dashboard
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>

            {(!tablesStatus.tables.todos || !tablesStatus.tables.users_sync) &&
              essentialVars.database && (
                <div className="mt-4">
                  <div className="flex gap-4">
                    <form action={runMigrations}>
                      <Button
                        type="submit"
                        className="bg-black text-white hover:bg-gray-800 px-3 py-1 rounded-md"
                      >
                        Run Migrations
                      </Button>
                    </form>
                    <form action={resetDatabase}>
                      <Button
                        type="submit"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 px-3 py-1 rounded-md"
                      >
                        Reset Database
                      </Button>
                    </form>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Run migrations to set up your database schema, or reset to
                    start fresh.
                  </p>
                </div>
              )}

            {needsRLS && essentialVars.database && (
              <div className="mt-4">
                <form action={configureRLS}>
                  <Button
                    type="submit"
                    className="bg-black text-white hover:bg-gray-800 px-3 py-1 rounded-md"
                  >
                    Configure RLS
                  </Button>
                </form>
                <p className="mt-2 text-xs text-gray-500">
                  Configure Row Level Security for secure data access.
                </p>
              </div>
            )}

            {!tablesStatus.jwks &&
              essentialVars.database &&
              essentialVars.stackProjectId && (
                <div className="mt-4">
                  <form action={configureJWKS}>
                    <Button
                      type="submit"
                      className="bg-black text-white hover:bg-gray-800 px-3 py-1 rounded-md"
                    >
                      Configure JWKS
                    </Button>
                  </form>
                  <p className="mt-2 text-xs text-gray-500">
                    Configure JWKS URL for StackAuth JWT authentication.
                  </p>
                </div>
              )}

            {!essentialVars.database && (
              <div className="mt-3 flex items-center text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>
                  Database connection required before running migrations
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Vercel Section */}
        <section className="rounded-lg border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center mr-2">
              <svg
                width="32"
                height="32"
                viewBox="0 0 76 64"
                fill="none"
                className="text-gray-800"
              >
                <path
                  d="M37.5274 0L75.0548 65H0L37.5274 0Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Deployment
              </h3>
              <p className="text-sm text-gray-600">Host your app on Vercel</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-700">
                Stripe needs a publicly accessible URL to send webhook events.
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-2">
                <li>
                  <strong className="font-medium">v0</strong> Deploy your app
                  and use the production URL
                </li>
                <li>
                  <strong className="font-medium">Localhost</strong> Run the
                  following command to get a tunnel{' '}
                  <code className="block bg-gray-200 mt-1 px-1.5 py-0.5 text-xs rounded text-gray-800">
                    npx untun@latest tunnel http://localhost:3000
                  </code>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                {!!process.env.VERCEL_URL ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar name="VERCEL_URL" exists={!!process.env.VERCEL_URL} />
                  <p className="mt-1 text-sm text-gray-500">
                    Your Vercel deployment URL (automatically set by Vercel)
                    {process.env.VERCEL_URL && (
                      <span className="block mt-1 font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {process.env.VERCEL_URL}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.NEXT_PUBLIC_VERCEL_URL ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="NEXT_PUBLIC_VERCEL_URL"
                    exists={!!process.env.NEXT_PUBLIC_VERCEL_URL}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Use your production deployment URL. This is used for Stripe
                    webhooks
                    {process.env.NEXT_PUBLIC_VERCEL_URL && (
                      <span className="block mt-1 font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {process.env.NEXT_PUBLIC_VERCEL_URL}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.VERCEL_OIDC_TOKEN ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="VERCEL_OIDC_TOKEN"
                    exists={!!process.env.VERCEL_OIDC_TOKEN}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    OIDC token for vercel-queue authentication. See{' '}
                    <a
                      href="https://vercel.com/docs/oidc"
                      target="_blank"
                      className="text-black underline hover:no-underline"
                      rel="noreferrer"
                    >
                      OIDC documentation
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="https://vercel.com/docs/projects/environment-variables"
                target="_blank"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
              >
                Learn more about Vercel environment variables
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="rounded-lg border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-gray-200 mr-2">
              <img
                src="https://pbs.twimg.com/profile_images/1721983345886003200/mJn-P1UH_400x400.jpg"
                alt="xAI Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                xAI (Grok)
              </h3>
              <p className="text-sm text-gray-600">
                AI language model for generating todo descriptions and content
              </p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-start">
                {!!process.env.XAI_API_KEY ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="XAI_API_KEY"
                    exists={!!process.env.XAI_API_KEY}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Get your API key from the{' '}
                    <a
                      href="https://console.x.ai"
                      target="_blank"
                      className="text-black underline hover:no-underline"
                      rel="noreferrer"
                    >
                      xAI Console
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="https://docs.x.ai/api"
                target="_blank"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
              >
                xAI API documentation
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Stripe Section */}
        <section className="rounded-lg border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-gray-200 mr-2">
              <img
                src="https://media.glassdoor.com/sql/671932/stripe-squarelogo-1610580619584.png"
                alt="Stripe Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Stripe</h3>
              <p className="text-sm text-gray-600">
                Payment processing and subscriptions
              </p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-start">
                {!!process.env.STRIPE_SECRET_KEY ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="STRIPE_SECRET_KEY"
                    exists={!!process.env.STRIPE_SECRET_KEY}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Get your API key from the{' '}
                    <a
                      href="https://dashboard.stripe.com/test/apikeys"
                      target="_blank"
                      className="text-black underline hover:no-underline"
                      rel="noreferrer"
                    >
                      Stripe Dashboard
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.STRIPE_WEBHOOK_SECRET ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="STRIPE_WEBHOOK_SECRET"
                    exists={!!process.env.STRIPE_WEBHOOK_SECRET}
                  />
                </div>
              </div>
            </div>

            <StripeWebhookForm
              canRegister={canRegisterWebhook}
              webhookSecretExists={!!process.env.STRIPE_WEBHOOK_SECRET}
            />

            <div className="pt-2">
              <Link
                href="https://stripe.com/docs/webhooks"
                target="_blank"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
              >
                Learn more about Stripe webhooks
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
