import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  AlertTriangle,
  Server,
  Clock,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StripeWebhookForm } from './template-setup/stripe-webhook-form'
import {
  checkMigrations,
  runMigrations,
  resetDatabase,
  configureRLS,
  configureJWKS,
} from './template-setup/actions'
import { Badge } from '@/components/ui/badge'

// First, let's create a reusable CSS class for environment variables
const EnvVar = ({ name, exists }: { name: string; exists: boolean }) => (
  <p className={`font-medium font-mono ${!exists ? 'text-gray-500' : ''}`}>
    {name}
  </p>
)

export default async function DevChecklistPage() {
  const tablesStatus = await checkMigrations()
  const migrationsRun =
    tablesStatus.tables.todos &&
    tablesStatus.tables.user_metrics &&
    tablesStatus.tables.users_sync

  // Check which essential environment variables are missing
  const essentialVars = {
    database: !!process.env.DATABASE_URL,
    stackProjectId: !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    stackPublishableKey: !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    stackServerKey: !!process.env.STACK_SECRET_SERVER_KEY,
  }

  // Calculate progress percentage
  const totalSteps = 12 // Total number of environment variables and migrations we're checking
  const completedSteps = [
    !!process.env.DATABASE_URL,
    !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    !!process.env.STACK_SECRET_SERVER_KEY,
    !!process.env.VERCEL_URL,
    !!process.env.NEXT_PUBLIC_VERCEL_URL,
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
  const needsRLS = ['todos', 'user_metrics', 'users_sync'].some(
    (table) =>
      !tablesStatus.rls.tables?.[table]?.rlsEnabled ||
      !tablesStatus.rls.tables?.[table]?.hasPolicy,
  )

  return (
    <div className="container mx-auto max-w-3xl py-8">
      {/* Hero Section */}
      <section className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="secondary" className="mb-6">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            Production Ready
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            NeonAuth + Stripe
            <br />
            <span className="text-gray-600">v0 Template</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Follow the steps below to set up the integrations your project will
            need.
          </p>
        </div>
      </section>

      <div className="mb-12 text-center max-w-lg mx-auto">
        {/* Progress bar */}
        <div className="mt-6 flex items-center justify-center">
          <div className="w-full">
            <div className="flex items-center justify-end mb-1">
              <span className="text-gray-600">
                {completedSteps}/{totalSteps}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-black transition-all duration-500 ease-in-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cleanup Instructions - only show when complete */}
      {isComplete && (
        <section className="rounded-lg border border-green-200 bg-green-50 p-6 mb-8">
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
              <h3 className="text-lg font-semibold text-gray-800">Neon</h3>
              <p className="text-sm text-gray-600">
                The database stores your users and data
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
                {tablesStatus.tables.user_metrics ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      !tablesStatus.tables.user_metrics ? 'text-gray-500' : ''
                    }`}
                  >
                    User Metrics Table
                  </p>
                  <div className="flex gap-2 text-xs mt-1">
                    {tablesStatus.rls.tables?.user_metrics?.rlsEnabled ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 align-text-bottom" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.user_metrics?.rlsEnabled
                          ? 'text-red-500'
                          : ''
                      }
                    >
                      RLS enabled
                    </span>
                    {tablesStatus.rls.tables?.user_metrics?.hasPolicy ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom ml-2" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 align-text-bottom ml-2" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.user_metrics?.hasPolicy
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
                          {tablesStatus.jwksList.map((jwks, index) => (
                            <div key={index} className="bg-gray-50 p-2 rounded">
                              <p className="text-xs font-mono break-all">
                                {jwks.jwks_url}
                              </p>
                            </div>
                          ))}
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

            {(!tablesStatus.tables.todos ||
              !tablesStatus.tables.user_metrics ||
              !tablesStatus.tables.users_sync) &&
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
                Stripe and QStash need a publicly accessible URL to send their
                webhook events.
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
                    and QStash webhooks
                    {process.env.NEXT_PUBLIC_VERCEL_URL && (
                      <span className="block mt-1 font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {process.env.NEXT_PUBLIC_VERCEL_URL}
                      </span>
                    )}
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

        {/* QStash Section */}
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
                Upstash QStash
              </h3>
              <p className="text-sm text-gray-600">
                QStash is a message queue for background tasks and bulk
                operations.
              </p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <h4 className="font-medium text-sm mb-2">
                How to set up QStash:
              </h4>
              <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-2">
                <li>
                  Go to{' '}
                  <span className="font-medium">
                    Integrations → Upstash → Manage
                  </span>{' '}
                  in your Vercel dashboard
                </li>
                <li>
                  Click <span className="font-medium">Open in Upstash</span>
                </li>
                <li>
                  Select the <span className="font-medium">QStash</span> tab
                </li>
                <li>Copy the environment keys to your Vercel project</li>
              </ol>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                {!!process.env.QSTASH_URL ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar name="QSTASH_URL" exists={!!process.env.QSTASH_URL} />
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.QSTASH_TOKEN ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="QSTASH_TOKEN"
                    exists={!!process.env.QSTASH_TOKEN}
                  />
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.QSTASH_CURRENT_SIGNING_KEY ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="QSTASH_CURRENT_SIGNING_KEY"
                    exists={!!process.env.QSTASH_CURRENT_SIGNING_KEY}
                  />
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.QSTASH_NEXT_SIGNING_KEY ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="QSTASH_NEXT_SIGNING_KEY"
                    exists={!!process.env.QSTASH_NEXT_SIGNING_KEY}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="https://upstash.com/docs/qstash/overall/getstarted"
                target="_blank"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
              >
                QStash documentation
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

      {/* Footer */}
      <footer className="mt-20 border-t pt-8 pb-16 text-center">
        <p className="text-sm text-gray-500 font-mono">
          Engineered by{' '}
          <a
            href="https://x.com/jacobmparis"
            target="_blank"
            className="text-black hover:underline"
          >
            Jacob Paris
          </a>{' '}
          in cooperation with{' '}
          <a
            href="https://neon.tech"
            target="_blank"
            className="font-medium tracking-tight bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent hover:underline"
          >
            Neon
          </a>
        </p>
      </footer>
    </div>
  )
}
