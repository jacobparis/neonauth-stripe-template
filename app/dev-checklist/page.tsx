import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
  Database,
  CreditCard,
  Globe,
  Server,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { StripeWebhookForm } from './stripe-webhook-form'

// SQL scripts content - split into individual statements
const createTablesSQL = [
  `CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#4f46e5',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    owner_id TEXT,
    FOREIGN KEY (owner_id) REFERENCES neon_auth.users_sync(id)
  );`,

  `CREATE TABLE IF NOT EXISTS user_metrics (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    todos_created INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES neon_auth.users_sync(id)
  );`,

  `CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    project_id INTEGER REFERENCES projects(id),
    user_id TEXT REFERENCES neon_auth.users_sync(id),
    owner_id TEXT,
    FOREIGN KEY (owner_id) REFERENCES neon_auth.users_sync(id)
  );`,

  `CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    issue_number SERIAL NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    user_id VARCHAR(255) NOT NULL
  );`,
]

const createIndexesSQL = [
  `CREATE INDEX IF NOT EXISTS idx_todos_owner_id ON todos(owner_id);`,
  `CREATE INDEX IF NOT EXISTS idx_todos_project_id ON todos(project_id);`,
  `CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);`,
  `CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id ON user_metrics(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);`,
]

const createSampleDataSQL = [
  `INSERT INTO projects (name, color)
  VALUES ('Personal', '#4f46e5')
  ON CONFLICT DO NOTHING;`,

  `INSERT INTO projects (name, color)
  VALUES ('Work', '#ef4444')
  ON CONFLICT DO NOTHING;`,
]

// This is a PL/pgSQL block, which needs to be executed as a single statement
const updateTodosSchemaSQL = `
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'todos') THEN
        -- Check if the text column exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'todos' AND column_name = 'text') THEN
            -- Rename text column to title
            ALTER TABLE todos RENAME COLUMN text TO title;
        ELSIF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'todos' AND column_name = 'title') THEN
            -- Add title column if neither text nor title exists
            ALTER TABLE todos ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '';
        END IF;
    ELSE
        -- Create todos table if it doesn't exist
        CREATE TABLE todos (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT false,
            due_date TIMESTAMP,
            project_id INTEGER,
            assigned_to_id VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;
`

async function checkMigrations() {
  try {
    // Check if the required tables exist
    const result = await db.execute(sql`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'todos') as todos_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') as projects_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_metrics') as user_metrics_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'issues') as issues_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'neon_auth' AND table_name = 'users_sync') as users_sync_exists
    `)

    return result.rows[0]
  } catch (error) {
    console.error('Error checking migrations:', error)
    return {
      todos_exists: false,
      projects_exists: false,
      user_metrics_exists: false,
      issues_exists: false,
      users_sync_exists: false,
    }
  }
}

async function runMigrations() {
  'use server'

  try {
    console.log('Running migrations...')

    // Execute each statement in createTablesSQL separately
    console.log('Running create tables migration...')
    for (const statement of createTablesSQL) {
      await db.execute(sql.raw(statement))
    }

    // Execute each statement in createIndexesSQL separately
    console.log('Running create indexes migration...')
    for (const statement of createIndexesSQL) {
      await db.execute(sql.raw(statement))
    }

    // Execute each statement in createSampleDataSQL separately
    console.log('Running create sample data migration...')
    for (const statement of createSampleDataSQL) {
      await db.execute(sql.raw(statement))
    }

    // Execute the PL/pgSQL block as a single statement
    console.log('Running update todos schema migration...')
    await db.execute(sql.raw(updateTodosSchemaSQL))

    // Revalidate the page to show updated migration status
    revalidatePath('/dev-checklist')

    return { success: true }
  } catch (error) {
    console.error('Error running migrations:', error)
    return { success: false, error: error.message }
  }
}

export default async function DevChecklistPage() {
  const tablesStatus = await checkMigrations()
  const migrationsRun =
    tablesStatus.todos_exists &&
    tablesStatus.projects_exists &&
    tablesStatus.user_metrics_exists &&
    tablesStatus.issues_exists

  // Check which essential environment variables are missing
  const essentialVars = {
    database: !!process.env.DATABASE_URL,
    stackProjectId: !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    stackPublishableKey: !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    stackServerKey: !!process.env.STACK_SECRET_SERVER_KEY,
  }

  const allEssentialVarsConfigured = Object.values(essentialVars).every(Boolean)
  const skipDevChecklist = process.env.SKIP_DEV_CHECKLIST === 'true'

  // Calculate progress percentage
  const totalSteps = 12 // Total number of environment variables we're checking
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

  // Check if we can register Stripe webhook
  const canRegisterWebhook =
    !!process.env.STRIPE_SECRET_KEY && !!process.env.VERCEL_URL

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-black" />
            <h1 className="text-xl font-bold">FreshNeon Setup</h1>
          </div>
          {allEssentialVarsConfigured && (
            <Link href="/app" className="text-gray-600 hover:text-black">
              Go to Application{' '}
              <ChevronRight className="ml-1 inline-block h-4 w-4" />
            </Link>
          )}
        </div>
      </header>

      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold tracking-tight">Project Setup</h2>
            <p className="mt-4 text-lg text-gray-500">
              Complete the following steps to set up your FreshNeon project
            </p>

            {/* Progress bar */}
            <div className="mt-8 flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    {completedSteps} of {totalSteps} completed
                  </span>
                  <span className="font-medium">{progressPercentage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-black transition-all duration-500 ease-in-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {!allEssentialVarsConfigured && (
            <Alert className="mb-8 border border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">
                Required Configuration Missing
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                You need to complete the essential configuration steps before
                you can use the application.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-8">
            {/* Neon Integration Section (Database + Auth) */}
            <section className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mr-4">
                  <Database className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Neon Integration</h3>
                  <p className="text-sm text-gray-500">
                    Database and authentication with NeonAuth (enable in Vercel
                    to auto-configure)
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    {essentialVars.database ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center">
                        <p
                          className={`font-medium ${
                            !essentialVars.database ? 'text-gray-500' : ''
                          }`}
                        >
                          DATABASE_URL
                        </p>
                        {!essentialVars.database && (
                          <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 font-medium">
                            Required
                          </span>
                        )}
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
                        <p
                          className={`font-medium ${
                            !essentialVars.stackProjectId ? 'text-gray-500' : ''
                          }`}
                        >
                          NEXT_PUBLIC_STACK_PROJECT_ID
                        </p>
                        {!essentialVars.stackProjectId && (
                          <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 font-medium">
                            Required
                          </span>
                        )}
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
                        <p
                          className={`font-medium ${
                            !essentialVars.stackPublishableKey
                              ? 'text-gray-500'
                              : ''
                          }`}
                        >
                          NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
                        </p>
                        {!essentialVars.stackPublishableKey && (
                          <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 font-medium">
                            Required
                          </span>
                        )}
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
                        <p
                          className={`font-medium ${
                            !essentialVars.stackServerKey ? 'text-gray-500' : ''
                          }`}
                        >
                          STACK_SECRET_SERVER_KEY
                        </p>
                        {!essentialVars.stackServerKey && (
                          <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 font-medium">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="https://vercel.com/integrations/neon"
                    target="_blank"
                    className="inline-flex items-center text-sm font-medium text-black hover:underline mr-4"
                  >
                    Enable Neon Integration
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                  <Link
                    href="https://neon.tech/docs/guides/neonauth"
                    target="_blank"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mr-4"
                  >
                    NeonAuth documentation
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </div>
            </section>

            {/* Upstash Redis Section */}
            <section className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mr-4">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-gray-700"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Upstash Redis</h3>
                  <p className="text-sm text-gray-500">
                    Redis for caching and data storage (enable in Vercel to
                    auto-configure)
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start">
                    {!!process.env.KV_URL ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !process.env.KV_URL ? 'text-gray-500' : ''
                        }`}
                      >
                        KV_URL
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    {!!process.env.KV_REST_API_TOKEN ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !process.env.KV_REST_API_TOKEN ? 'text-gray-500' : ''
                        }`}
                      >
                        KV_REST_API_TOKEN
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    {!!process.env.KV_REST_API_READ_ONLY_TOKEN ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !process.env.KV_REST_API_READ_ONLY_TOKEN
                            ? 'text-gray-500'
                            : ''
                        }`}
                      >
                        KV_REST_API_READ_ONLY_TOKEN
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="https://vercel.com/integrations/upstash"
                    target="_blank"
                    className="inline-flex items-center text-sm font-medium text-black hover:underline mr-4"
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
            <section className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mr-4">
                  <Server className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Database Migrations</h3>
                  <p className="text-sm text-gray-500">
                    Set up required database tables and sample data
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    {tablesStatus.users_sync_exists ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !tablesStatus.users_sync_exists ? 'text-gray-500' : ''
                        }`}
                      >
                        neon_auth.users_sync
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    {tablesStatus.projects_exists ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !tablesStatus.projects_exists ? 'text-gray-500' : ''
                        }`}
                      >
                        projects
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    {tablesStatus.user_metrics_exists ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !tablesStatus.user_metrics_exists
                            ? 'text-gray-500'
                            : ''
                        }`}
                      >
                        user_metrics
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    {tablesStatus.todos_exists ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !tablesStatus.todos_exists ? 'text-gray-500' : ''
                        }`}
                      >
                        todos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    {tablesStatus.issues_exists ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !tablesStatus.issues_exists ? 'text-gray-500' : ''
                        }`}
                      >
                        issues
                      </p>
                    </div>
                  </div>
                </div>

                {!migrationsRun && essentialVars.database && (
                  <div className="mt-4">
                    <form action={runMigrations}>
                      <Button
                        type="submit"
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        Run Migrations
                      </Button>
                    </form>
                    <p className="mt-2 text-xs text-gray-500">
                      This will create all necessary tables and indexes for your
                      application.
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
            <section className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mr-4">
                  <Globe className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Deployment</h3>
                  <p className="text-sm text-gray-500">
                    Vercel deployment configuration
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start">
                    {!!process.env.VERCEL_URL ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !process.env.VERCEL_URL ? 'text-gray-500' : ''
                        }`}
                      >
                        VERCEL_URL
                      </p>
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
                      <p
                        className={`font-medium ${
                          !process.env.NEXT_PUBLIC_VERCEL_URL
                            ? 'text-gray-500'
                            : ''
                        }`}
                      >
                        NEXT_PUBLIC_VERCEL_URL
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Use your production deployment URL. This is used for
                        Stripe and QStash webhooks
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
            <section className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mr-4">
                  <Clock className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">QStash</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    {`- go to Integrations -> Upstash -> Manage
- click Open in Upstash
- select the QStash tab
- copy the environment keys`}
                  </p>
                  <div className="flex items-start">
                    {!!process.env.QSTASH_URL ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !process.env.QSTASH_URL ? 'text-gray-500' : ''
                        }`}
                      >
                        QSTASH_URL
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    {!!process.env.QSTASH_TOKEN ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !process.env.QSTASH_TOKEN ? 'text-gray-500' : ''
                        }`}
                      >
                        QSTASH_TOKEN
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    {!!process.env.QSTASH_CURRENT_SIGNING_KEY ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !process.env.QSTASH_CURRENT_SIGNING_KEY
                            ? 'text-gray-500'
                            : ''
                        }`}
                      >
                        QSTASH_CURRENT_SIGNING_KEY
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    {!!process.env.QSTASH_NEXT_SIGNING_KEY ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !process.env.QSTASH_NEXT_SIGNING_KEY
                            ? 'text-gray-500'
                            : ''
                        }`}
                      >
                        QSTASH_NEXT_SIGNING_KEY
                      </p>
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
            <section className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mr-4">
                  <CreditCard className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Stripe</h3>
                  <p className="text-sm text-gray-500">
                    Payment processing and subscriptions
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start">
                    {!!process.env.STRIPE_SECRET_KEY ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          !process.env.STRIPE_SECRET_KEY ? 'text-gray-500' : ''
                        }`}
                      >
                        STRIPE_SECRET_KEY
                      </p>
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
                      <p
                        className={`font-medium ${
                          !process.env.STRIPE_WEBHOOK_SECRET
                            ? 'text-gray-500'
                            : ''
                        }`}
                      >
                        STRIPE_WEBHOOK_SECRET
                      </p>
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

            {/* Skip Checklist Section */}
            <section className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mr-4">
                  <ArrowRight className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Skip Checklist</h3>
                  <p className="text-sm text-gray-500">
                    Bypass this checklist in the future
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start">
                  {skipDevChecklist ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                  )}
                  <div>
                    <p
                      className={`font-medium ${
                        !skipDevChecklist ? 'text-gray-500' : ''
                      }`}
                    >
                      SKIP_DEV_CHECKLIST
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Set this environment variable to "true" to bypass this
                      checklist
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Cleanup Instructions */}
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-800">
                    Cleanup Instructions
                  </h3>
                  <p className="mt-2 text-sm text-amber-700">
                    Once you've completed the setup and your application is
                    working correctly:
                  </p>
                  <ol className="mt-4 space-y-2 text-sm text-amber-700 list-decimal pl-5">
                    <li>
                      Set the{' '}
                      <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">
                        SKIP_DEV_CHECKLIST
                      </code>{' '}
                      environment variable to "true"
                    </li>
                    <li>
                      For production, remove the dev-checklist page by deleting
                      the{' '}
                      <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">
                        app/dev-checklist
                      </code>{' '}
                      directory
                    </li>
                    <li>
                      Update the middleware.ts file to remove the special rule
                      for the dev-checklist page
                    </li>
                  </ol>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
