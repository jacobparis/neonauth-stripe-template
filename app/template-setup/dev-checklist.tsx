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
    <p
      className={`font-medium font-mono ${
        !exists ? 'text-muted-foreground' : ''
      }`}
    >
      {name}
    </p>
  )
}

export async function DevChecklistPage() {
  const tablesStatus = await checkMigrations()
  const migrationsRun =
    tablesStatus.tables.todos &&
    tablesStatus.tables.users_sync &&
    tablesStatus.tables.comments &&
    tablesStatus.tables.activities

  // Check which essential environment variables are missing
  const essentialVars = {
    database: !!process.env.DATABASE_URL,
    stackProjectId: !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    stackPublishableKey: !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    stackServerKey: !!process.env.STACK_SECRET_SERVER_KEY,
  }

  // Calculate progress percentage
  const totalSteps = 17 // Updated total to include 4 QStash environment variables
  const completedSteps = [
    !!process.env.DATABASE_URL,
    !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    !!process.env.STACK_SECRET_SERVER_KEY,
    !!process.env.VERCEL_URL,
    !!process.env.NEXT_PUBLIC_VERCEL_URL,
    !!process.env.XAI_API_KEY,
    !!process.env.KV_URL,
    !!process.env.KV_REST_API_TOKEN,
    !!process.env.KV_REST_API_READ_ONLY_TOKEN,
    !!process.env.QSTASH_CURRENT_SIGNING_KEY,
    !!process.env.QSTASH_NEXT_SIGNING_KEY,
    !!process.env.QSTASH_TOKEN,
    !!process.env.QSTASH_URL,
    !!process.env.STRIPE_SECRET_KEY,
    !!process.env.STRIPE_WEBHOOK_SECRET,
    migrationsRun,
  ].filter(Boolean).length

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
        <section className="mt-8 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-6 mb-8">
          <div className="flex">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Setup Complete!
              </h3>
              <ol className="mt-4 space-y-2 text-sm text-green-700 dark:text-green-300 list-decimal pl-5">
                <li>
                  Delete the{' '}
                  <code className="bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded text-green-800 dark:text-green-200">
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
        <section className="mt-8 rounded-lg border border-border bg-card p-6 mb-8">
          <div className="flex">
            <div>
              <h3 className="font-semibold text-foreground">
                <span className="text-muted-foreground">
                  {completedSteps}/{totalSteps}
                </span>{' '}
                steps complete
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground list-disc pl-5">
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
        <section className="rounded-lg border border-border overflow-hidden shadow-sm bg-card">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-muted mr-2">
              <img
                src="https://vercel.com/api/www/avatar/f3f5c58cf14f239dd686ee96fee64e842c70bbfb?s=72"
                alt="Neon Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Neon + NeonAuth
              </h3>
              <p className="text-sm text-muted-foreground">
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
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
                className="inline-flex items-center text-sm font-medium text-foreground hover:underline mr-2"
              >
                Enable Neon Integration
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
              <Link
                href="https://neon.tech/docs/guides/neon-auth"
                target="_blank"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mr-2"
              >
                NeonAuth documentation
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Upstash Redis Section */}
        <section className="rounded-lg border border-border overflow-hidden shadow-sm bg-card">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-muted mr-2">
              <img
                src="https://vercel.com/api/www/avatar/cfffdb788d0e6372f30572554f6e82fb45d4792a?s=72"
                alt="Upstash Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Upstash Redis
              </h3>
              <p className="text-sm text-muted-foreground">
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar name="KV_URL" exists={!!process.env.KV_URL} />
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.KV_REST_API_TOKEN ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
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
                className="inline-flex items-center text-sm font-medium text-foreground hover:underline mr-2"
              >
                Enable Upstash Integration
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
              <Link
                href="https://upstash.com/docs/redis/overall/getstarted"
                target="_blank"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                Redis documentation
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Upstash QStash Section */}
        <section className="rounded-lg border border-border overflow-hidden shadow-sm bg-card">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-muted mr-2">
              <img
                src="https://vercel.com/api/www/avatar/cfffdb788d0e6372f30572554f6e82fb45d4792a?s=72"
                alt="Upstash Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Upstash QStash
              </h3>
              <p className="text-sm text-muted-foreground">
                Message queue for background jobs and webhooks
              </p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-start">
                {!!process.env.QSTASH_CURRENT_SIGNING_KEY ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="QSTASH_NEXT_SIGNING_KEY"
                    exists={!!process.env.QSTASH_NEXT_SIGNING_KEY}
                  />
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.QSTASH_TOKEN ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="QSTASH_TOKEN"
                    exists={!!process.env.QSTASH_TOKEN}
                  />
                </div>
              </div>

              <div className="flex items-start">
                {!!process.env.QSTASH_URL ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar name="QSTASH_URL" exists={!!process.env.QSTASH_URL} />
                </div>
              </div>
            </div>

            <div className="pt-2 text-sm">
              Integrations {' -> '} Manage Upstash {' -> '} Open in Upstash{' '}
              {' -> '} QStash {' -> '} and then copy the environment variables
            </div>
          </div>
        </section>

        {/* Database Migrations Section */}
        <section className="rounded-lg border border-border overflow-hidden shadow-sm bg-card">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-muted mr-2">
              <img
                src="https://vercel.com/api/www/avatar/f3f5c58cf14f239dd686ee96fee64e842c70bbfb?s=72"
                alt="Neon Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Database Tables
              </h3>
              <p className="text-sm text-muted-foreground">
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      !tablesStatus.tables.todos ? 'text-muted-foreground' : ''
                    }`}
                  >
                    Todos Table
                  </p>
                  <div className="flex gap-2 text-xs mt-1">
                    {tablesStatus.rls.tables?.todos?.rlsEnabled ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 dark:text-red-700 align-text-bottom" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.todos?.rlsEnabled
                          ? 'text-red-500 dark:text-red-400'
                          : ''
                      }
                    >
                      RLS enabled
                    </span>
                    {tablesStatus.rls.tables?.todos?.hasPolicy ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom ml-2" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 dark:text-red-700 align-text-bottom ml-2" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.todos?.hasPolicy
                          ? 'text-red-500 dark:text-red-400'
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      !tablesStatus.tables.users_sync
                        ? 'text-muted-foreground'
                        : ''
                    }`}
                  >
                    Users Sync Table
                  </p>
                  <div className="flex gap-2 text-xs mt-1">
                    {tablesStatus.rls.tables?.users_sync?.rlsEnabled ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 dark:text-red-700 align-text-bottom" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.users_sync?.rlsEnabled
                          ? 'text-red-500 dark:text-red-400'
                          : ''
                      }
                    >
                      RLS enabled
                    </span>
                    {tablesStatus.rls.tables?.users_sync?.hasPolicy ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom ml-2" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 dark:text-red-700 align-text-bottom ml-2" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.users_sync?.hasPolicy
                          ? 'text-red-500 dark:text-red-400'
                          : ''
                      }
                    >
                      Policy present
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                {tablesStatus.tables.comments ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      !tablesStatus.tables.comments
                        ? 'text-muted-foreground'
                        : ''
                    }`}
                  >
                    Comments Table
                  </p>
                  <div className="flex gap-2 text-xs mt-1">
                    {tablesStatus.rls.tables?.comments?.rlsEnabled ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 dark:text-red-700 align-text-bottom" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.comments?.rlsEnabled
                          ? 'text-red-500 dark:text-red-400'
                          : ''
                      }
                    >
                      RLS enabled
                    </span>
                    {tablesStatus.rls.tables?.comments?.hasPolicy ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom ml-2" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 dark:text-red-700 align-text-bottom ml-2" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.comments?.hasPolicy
                          ? 'text-red-500 dark:text-red-400'
                          : ''
                      }
                    >
                      Policy present
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                {tablesStatus.tables.activities ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      !tablesStatus.tables.activities
                        ? 'text-muted-foreground'
                        : ''
                    }`}
                  >
                    Activities Table
                  </p>
                  <div className="flex gap-2 text-xs mt-1">
                    {tablesStatus.rls.tables?.activities?.rlsEnabled ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 dark:text-red-700 align-text-bottom" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.activities?.rlsEnabled
                          ? 'text-red-500 dark:text-red-400'
                          : ''
                      }
                    >
                      RLS enabled
                    </span>
                    {tablesStatus.rls.tables?.activities?.hasPolicy ? (
                      <CheckCircle2 className="inline h-4 w-4 text-green-500 align-text-bottom ml-2" />
                    ) : (
                      <Circle className="inline h-4 w-4 text-red-300 dark:text-red-700 align-text-bottom ml-2" />
                    )}
                    <span
                      className={
                        !tablesStatus.rls.tables?.activities?.hasPolicy
                          ? 'text-red-500 dark:text-red-400'
                          : ''
                      }
                    >
                      Policy present
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start mt-6 mb-4">
                {!!process.env.NEON_API_KEY ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="NEON_API_KEY"
                    exists={!!process.env.NEON_API_KEY}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Only required if you want to enable Row Level Security for
                    your tables. Get it from your{' '}
                    <a
                      href="https://console.neon.tech/app/settings/api-keys"
                      target="_blank"
                      className="text-foreground underline hover:no-underline"
                    >
                      Neon dashboard
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>

            {essentialVars.database && (
              <div className="mt-4">
                <div className="flex gap-4">
                  <form action={runMigrations}>
                    <Button
                      type="submit"
                      className="bg-foreground text-background hover:bg-foreground/90 px-3 py-1 rounded-md"
                    >
                      Run Migrations
                    </Button>
                  </form>
                  <form action={resetDatabase}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300 px-3 py-1 rounded-md"
                    >
                      Reset Database
                    </Button>
                  </form>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
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
                    className="bg-foreground text-background hover:bg-foreground/90 px-3 py-1 rounded-md"
                  >
                    Configure RLS
                  </Button>
                </form>
                <p className="mt-2 text-xs text-muted-foreground">
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
                      className="bg-foreground text-background hover:bg-foreground/90 px-3 py-1 rounded-md"
                    >
                      Configure JWKS
                    </Button>
                  </form>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Configure JWKS URL for StackAuth JWT authentication.
                  </p>
                </div>
              )}

            {!essentialVars.database && (
              <div className="mt-3 flex items-center text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>
                  Database connection required before running migrations
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Vercel Section */}
        <section className="rounded-lg border border-border overflow-hidden shadow-sm bg-card">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center mr-2">
              <svg
                width="32"
                height="32"
                viewBox="0 0 76 64"
                fill="none"
                className="text-foreground"
              >
                <path
                  d="M37.5274 0L75.0548 65H0L37.5274 0Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Deployment
              </h3>
              <p className="text-sm text-muted-foreground">
                Host your app on Vercel
              </p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-muted p-4 rounded-md mb-4">
              <p className="text-sm text-foreground">
                Stripe needs a publicly accessible URL to send webhook events.
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-foreground space-y-2">
                <li>
                  <strong className="font-medium">v0</strong> Deploy your app
                  and use the production URL
                </li>
                <li>
                  <strong className="font-medium">Localhost</strong> Run the
                  following command to get a tunnel{' '}
                  <code className="block bg-background mt-1 px-1.5 py-0.5 text-xs rounded text-foreground">
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar name="VERCEL_URL" exists={!!process.env.VERCEL_URL} />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your Vercel deployment URL (automatically set by Vercel)
                    {process.env.VERCEL_URL && (
                      <span className="block mt-1 font-mono bg-muted px-2 py-1 rounded text-xs">
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="NEXT_PUBLIC_VERCEL_URL"
                    exists={!!process.env.NEXT_PUBLIC_VERCEL_URL}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use your production deployment URL. This is used for Stripe
                    webhooks
                    {process.env.NEXT_PUBLIC_VERCEL_URL && (
                      <span className="block mt-1 font-mono bg-muted px-2 py-1 rounded text-xs">
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
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                Learn more about Vercel environment variables
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="rounded-lg border border-border overflow-hidden shadow-sm bg-card">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-muted mr-2">
              <img
                src="https://pbs.twimg.com/profile_images/1721983345886003200/mJn-P1UH_400x400.jpg"
                alt="xAI Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                xAI (optional)
              </h3>
              <p className="text-sm text-muted-foreground">
                AI model for prompts and web search
              </p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-start">
                {!!process.env.XAI_API_KEY ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="XAI_API_KEY"
                    exists={!!process.env.XAI_API_KEY}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get your API key from the{' '}
                    <a
                      href="https://console.x.ai"
                      target="_blank"
                      className="text-foreground underline hover:no-underline"
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
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                xAI API documentation
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Stripe Section */}
        <section className="rounded-lg border border-border overflow-hidden shadow-sm bg-card">
          <div className="flex items-center px-4 py-3">
            <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-muted mr-2">
              <img
                src="https://media.glassdoor.com/sql/671932/stripe-squarelogo-1610580619584.png"
                alt="Stripe Logo"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Stripe</h3>
              <p className="text-sm text-muted-foreground">
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div>
                  <EnvVar
                    name="STRIPE_SECRET_KEY"
                    exists={!!process.env.STRIPE_SECRET_KEY}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get your API key from the{' '}
                    <a
                      href="https://dashboard.stripe.com/test/apikeys"
                      target="_blank"
                      className="text-foreground underline hover:no-underline"
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
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
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
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
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
