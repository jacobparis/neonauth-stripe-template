'use server'

import Stripe from 'stripe'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@/drizzle/schema'

export async function getTableStatus() {
  try {
    // Check if DATABASE_URL is available first
    if (!process.env.DATABASE_URL) {
      console.log('DATABASE_URL not set, skipping table check')
      return {
        tables: {
          todos: false,
          users_sync: false,
          comments: false,
        },
        rls: {
          tables: {},
        },
      }
    }

    // Check each table individually
    const tables = ['todos', 'users_sync', 'comments']
    const results = await Promise.all(
      tables.map(async (table) => {
        try {
          let result
          if (table === 'users_sync') {
            result = await db.execute(sql`
              SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'neon_auth' AND table_name = ${table}
              ) as exists
            `)
          } else {
            result = await db.execute(sql`
              SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = ${table}
              ) as exists
            `)
          }
          return { table, exists: result.rows[0]?.exists || false }
        } catch (error) {
          return { table, exists: false }
        }
      }),
    )

    // Check RLS enabled and policies for each table
    const rlsTables = ['todos', 'users_sync']
    const rlsTableChecks = await Promise.all(
      rlsTables.map(async (table) => {
        try {
          // Check if RLS is enabled
          const rlsResult = await db.execute(sql`
            SELECT relrowsecurity FROM pg_class WHERE relname = ${table}
          `)
          const rlsEnabled = rlsResult.rows[0]?.relrowsecurity === true
          // Check if at least one policy exists
          const policyResult = await db.execute(sql`
            SELECT COUNT(*) as count FROM pg_policies WHERE tablename = ${table}
          `)
          const hasPolicy = Number(policyResult.rows[0]?.count) > 0
          return { table, rlsEnabled, hasPolicy }
        } catch (error) {
          return { table, rlsEnabled: false, hasPolicy: false }
        }
      }),
    )

    return {
      tables: Object.fromEntries(
        results.map(({ table, exists }) => [table, exists]),
      ),
      rls: {
        tables: Object.fromEntries(
          rlsTableChecks.map(({ table, rlsEnabled, hasPolicy }) => [
            table,
            { rlsEnabled, hasPolicy },
          ]),
        ),
      },
    }
  } catch (error) {
    console.error('Error checking table status:', error)
    return {
      tables: {
        todos: false,
        users_sync: false,
        comments: false,
      },
      rls: {
        tables: {},
      },
    }
  }
}

export async function enableRLS() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    // Enable RLS for todos table
    await db.execute(sql`ALTER TABLE todos ENABLE ROW LEVEL SECURITY;`)
    await db.execute(sql`DROP POLICY IF EXISTS todos_select ON todos;`)
    await db.execute(
      sql`CREATE POLICY todos_select ON todos FOR SELECT USING (true);`,
    )

    // Enable RLS for users_sync table
    await db.execute(sql`ALTER TABLE users_sync ENABLE ROW LEVEL SECURITY;`)
    await db.execute(
      sql`DROP POLICY IF EXISTS users_sync_select ON users_sync;`,
    )
    await db.execute(
      sql`CREATE POLICY users_sync_select ON users_sync FOR SELECT USING (true);`,
    )

    revalidatePath('/template-setup')
  } catch (error) {
    console.error('Error enabling RLS:', error)
    throw error
  }
}

export async function checkMigrations() {
  try {
    // Check if DATABASE_URL is available first
    if (!process.env.DATABASE_URL) {
      console.log('DATABASE_URL not set, skipping migration check')
      return {
        tables: {
          todos: false,
          users_sync: false,
        },
        rls: {
          extension: false,
          authenticated_grants: false,
          anonymous_grants: false,
          default_privileges: false,
          schema_usage: false,
        },
        jwks: false,
        jwksList: [],
      }
    }

    // Check each table individually
    const tables = ['todos', 'users_sync']
    const results = await Promise.all(
      tables.map(async (table) => {
        try {
          let result
          if (table === 'users_sync') {
            result = await db.execute(sql`
              SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'neon_auth' AND table_name = ${table}
              ) as exists
            `)
          } else {
            result = await db.execute(sql`
              SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = ${table}
              ) as exists
            `)
          }
          return { table, exists: result.rows[0]?.exists || false }
        } catch (error) {
          return { table, exists: false }
        }
      }),
    )

    // Check RLS configuration
    const rlsChecks = await Promise.all([
      // Check for pg_session_jwt extension
      db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'pg_session_jwt'
        ) as extension_exists
      `),
      // Check authenticated role grants
      db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.role_table_grants 
          WHERE grantee = 'authenticated' 
          AND table_schema = 'public'
          AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) as authenticated_grants
      `),
      // Check anonymous role grants
      db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.role_table_grants 
          WHERE grantee = 'anonymous' 
          AND table_schema = 'public'
          AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) as anonymous_grants
      `),
      // Check default privileges
      db.execute(sql`
        SELECT (
          SELECT COUNT(*) = 2 FROM (
            SELECT defaclrole::regrole::text as role, defaclacl
            FROM pg_default_acl
            WHERE defaclnamespace = 'public'::regnamespace
              AND defaclobjtype = 'r'
              AND defaclrole::regrole::text IN ('authenticated', 'anonymous')
          ) as acl
          WHERE
            array_to_string(acl.defaclacl, ',') LIKE '%=arwd%' -- grants all four privileges
        ) as default_privileges
      `),
      // Check schema usage grants
      db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.role_usage_grants 
          WHERE grantee IN ('authenticated', 'anonymous')
          AND object_schema = 'public'
          AND privilege_type = 'USAGE'
        ) as schema_usage
      `),
    ])

    // Check RLS enabled and policies for each table
    const rlsTables = ['todos', 'users_sync']
    const rlsTableChecks = await Promise.all(
      rlsTables.map(async (table) => {
        // Check if RLS is enabled
        const rlsResult = await db.execute(sql`
          SELECT relrowsecurity FROM pg_class WHERE relname = ${table}
        `)
        const rlsEnabled = rlsResult.rows[0]?.relrowsecurity === true
        // Check if at least one policy exists
        const policyResult = await db.execute(sql`
          SELECT COUNT(*) as count FROM pg_policies WHERE tablename = ${table}
        `)
        const hasPolicy = Number(policyResult.rows[0]?.count) > 0
        return { table, rlsEnabled, hasPolicy }
      }),
    )

    // Check JWKS configuration
    let jwksConfigured = false
    let jwksList = []

    // Use our API route instead of direct Neon API call
    if (process.env.NEON_API_KEY) {
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : 'http://localhost:3000'

        const response = await fetch(
          `${baseUrl}/template-setup/api/check-jwks`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )

        if (response.ok) {
          const data = await response.json()
          jwksConfigured = data.jwks
          jwksList = data.jwksList || []
        } else {
          const errorData = await response.json()
          console.error('JWKS check failed:', errorData.error)
        }
      } catch (error) {
        console.error('Error checking JWKS via API route:', error)
      }
    }

    return {
      tables: Object.fromEntries(
        results.map(({ table, exists }) => [table, exists]),
      ),
      rls: {
        extension: rlsChecks[0].rows[0]?.extension_exists || false,
        authenticated_grants:
          rlsChecks[1].rows[0]?.authenticated_grants || false,
        anonymous_grants: rlsChecks[2].rows[0]?.anonymous_grants || false,
        default_privileges: rlsChecks[3].rows[0]?.default_privileges || false,
        schema_usage: rlsChecks[4].rows[0]?.schema_usage || false,
        tables: Object.fromEntries(
          rlsTableChecks.map(({ table, rlsEnabled, hasPolicy }) => [
            table,
            { rlsEnabled, hasPolicy },
          ]),
        ),
      },
      jwks: jwksConfigured,
      jwksList,
    }
  } catch (error) {
    return {
      tables: {
        todos: false,
        users_sync: false,
      },
      rls: {
        extension: false,
        authenticated_grants: false,
        anonymous_grants: false,
        default_privileges: false,
        schema_usage: false,
      },
      jwks: false,
      jwksList: [],
    }
  }
}

export async function runMigrations(formData: FormData): Promise<void> {
  try {
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error(
        'DATABASE_URL environment variable is not set. Please configure your database first.',
      )
      return
    }

    console.log('Setting up client...')

    // verify the connection is working
    await db.execute(sql`SELECT 1`)

    // Run migrations manually
    console.log('Running migrations manually...')

    // Create todos table with correct column structure
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS todos (
        id varchar(255) PRIMARY KEY,
        title varchar(255) NOT NULL,
        description text,
        completed boolean DEFAULT false NOT NULL,
        due_date timestamp,
        user_id varchar(255),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        deleted_at timestamp
      )
    `)

    // Create comments table with correct column structure
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS comments (
        id varchar(255) PRIMARY KEY,
        content text NOT NULL,
        todo_id varchar(255) NOT NULL,
        user_id varchar(255) NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `)

    console.log('Migrations completed successfully')

    // Revalidate the page to show updated migration status
    revalidatePath('/dev-checklist')
  } catch (error) {
    console.error('Error running migrations:', error)
  }
}

export async function registerStripeWebhook() {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    const VERCEL_URL = process.env.VERCEL_URL

    if (!STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is required')
      return
    }

    if (!VERCEL_URL) {
      console.error('VERCEL_URL is required')
      return
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
    ] as Stripe.WebhookEndpointCreateParams.EnabledEvent[]

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

    if (existingEndpoint) {
      console.log(`ℹ️ Webhook already exists for ${webhookUrl}`)
      console.log(`ℹ️ Webhook ID: ${existingEndpoint.id}`)
      console.log(
        `ℹ️ Updating webhook to ensure it has the correct event types...`,
      )

      await stripe.webhookEndpoints.del(existingEndpoint.id)

      console.log(`✅ Webhook updated successfully!`)
    }

    // Create a new webhook endpoint
    const result = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: events,
      description: `Webhook for ${VERCEL_URL}`,
    })

    console.log(`✅ Webhook registered successfully!`)
    console.log(`ℹ️ Webhook ID: ${result.id}`)
    console.log(`ℹ️ Webhook Secret: ${result.secret}`)

    // Store the webhook ID and secret in the environment variables
    revalidatePath('/dev-checklist')

    return result
  } catch (error) {
    console.error(
      'Error registering webhook:',
      error instanceof Error ? error.message : 'Unknown error occurred',
    )
  }
}

export async function resetDatabase(formData: FormData): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set.')
      return
    }

    console.log('Resetting database...')
    const connection = neon(process.env.DATABASE_URL)
    const migrationDb = drizzle(connection, { schema })

    // Execute the commands in sequence
    await migrationDb.execute(sql`DROP SCHEMA IF EXISTS public CASCADE;`)
    await migrationDb.execute(sql`CREATE SCHEMA public;`)
    await migrationDb.execute(sql`GRANT ALL ON SCHEMA public TO public;`)

    revalidatePath('/dev-checklist')
  } catch (error) {
    console.error('Error resetting database:', error)
  }
}

export async function configureRLS(formData: FormData): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set.')
      return
    }

    console.log('Configuring RLS...')
    const connection = neon(process.env.DATABASE_URL)
    const migrationDb = drizzle(connection, { schema })

    // Create roles if they don't exist
    console.log('Creating roles...')
    await migrationDb.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anonymous') THEN
          CREATE ROLE anonymous;
        END IF;
      END
      $$;
    `)

    // Create extension
    console.log('Creating extension...')
    await migrationDb.execute(
      sql`CREATE EXTENSION IF NOT EXISTS pg_session_jwt;`,
    )

    // Grant permissions for existing tables
    console.log('Granting permissions...')
    await migrationDb.execute(sql`
      GRANT SELECT, UPDATE, INSERT, DELETE ON ALL TABLES
      IN SCHEMA public
      to authenticated;
    `)

    await migrationDb.execute(sql`
      GRANT SELECT, UPDATE, INSERT, DELETE ON ALL TABLES
      IN SCHEMA public
      to anonymous;
    `)

    // Set up default privileges
    console.log('Setting up default privileges...')
    await migrationDb.execute(sql`
      ALTER DEFAULT PRIVILEGES
      IN SCHEMA public
      GRANT SELECT, UPDATE, INSERT, DELETE ON TABLES
      TO authenticated;
    `)

    await migrationDb.execute(sql`
      ALTER DEFAULT PRIVILEGES
      IN SCHEMA public
      GRANT SELECT, UPDATE, INSERT, DELETE ON TABLES
      TO anonymous;
    `)

    // Grant schema usage
    console.log('Granting schema usage...')
    await migrationDb.execute(
      sql`GRANT USAGE ON SCHEMA public TO authenticated;`,
    )
    await migrationDb.execute(sql`GRANT USAGE ON SCHEMA public TO anonymous;`)

    // Check if tables exist before enabling RLS with more detailed logging
    console.log('Checking table existence...')
    const tableChecks = await Promise.all([
      migrationDb.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'todos'
        ) as exists
      `),
      migrationDb.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'neon_auth' AND table_name = 'users_sync'
        ) as exists
      `),
    ])

    const todosExists = tableChecks[0].rows[0]?.exists
    const usersExists = tableChecks[1].rows[0]?.exists

    console.log(
      `Tables status: todos=${todosExists}, users_sync=${usersExists}`,
    )

    // Only enable RLS and create policies for tables that exist
    if (todosExists) {
      try {
        console.log('Enabling RLS for todos table...')
        await migrationDb.execute(
          sql`ALTER TABLE todos ENABLE ROW LEVEL SECURITY;`,
        )
        console.log('Creating policy for todos table...')
        await migrationDb.execute(
          sql`DROP POLICY IF EXISTS todos_select ON todos;`,
        )
        await migrationDb.execute(
          sql`CREATE POLICY todos_select ON todos FOR SELECT USING (true);`,
        )
        console.log('✅ RLS configured for todos table')
      } catch (error) {
        console.error('❌ Error configuring RLS for todos table:', error)
        throw error
      }
    } else {
      console.log('⚠️ Todos table does not exist, skipping RLS configuration')
    }

    if (usersExists) {
      try {
        console.log('Enabling RLS for neon_auth.users_sync table...')
        await migrationDb.execute(
          sql`ALTER TABLE neon_auth.users_sync ENABLE ROW LEVEL SECURITY;`,
        )
        console.log('Creating policy for neon_auth.users_sync table...')
        await migrationDb.execute(
          sql`DROP POLICY IF EXISTS users_sync_select ON neon_auth.users_sync;`,
        )
        await migrationDb.execute(
          sql`CREATE POLICY users_sync_select ON neon_auth.users_sync FOR SELECT USING (true);`,
        )
        console.log('✅ RLS configured for users_sync table')
      } catch (error) {
        console.error('❌ Error configuring RLS for users_sync table:', error)
        // Let's check what's wrong with the table
        try {
          const tableInfo = await migrationDb.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_sync' AND table_schema = 'neon_auth'
            ORDER BY ordinal_position
          `)
          console.log('users_sync table structure:', tableInfo.rows)
        } catch (infoError) {
          console.error('Could not get table info:', infoError)
        }
        throw error
      }
    } else {
      console.log(
        '⚠️ Users_sync table does not exist, skipping RLS configuration',
      )
    }

    console.log('✅ RLS configuration completed successfully')
    revalidatePath('/dev-checklist')
  } catch (error) {
    console.error('❌ Error configuring RLS:', error)
    throw error
  }
}

export async function configureJWKS(formData: FormData): Promise<void> {
  try {
    if (
      !process.env.DATABASE_URL ||
      !process.env.NEXT_PUBLIC_STACK_PROJECT_ID
    ) {
      console.error(
        'DATABASE_URL and NEXT_PUBLIC_STACK_PROJECT_ID are required.',
      )
      return
    }

    // Get project ID directly from the database instead of environment variable
    const projectIdResult = await getNeonProjectId()
    if (!projectIdResult.success) {
      console.error(`Failed to get Neon project ID: ${projectIdResult.error}`)
      return
    }

    const projectId = projectIdResult.projectId

    const jwksUrl = `https://api.stack-auth.com/api/v1/projects/${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}/.well-known/jwks.json`

    // Add JWKS URL to Neon project
    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${projectId}/jwks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEON_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jwks_url: jwksUrl,
          provider_name: 'StackAuth',
          role_names: ['authenticated', 'anonymous'],
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json()
      console.error(error.message || 'Failed to configure JWKS')
      return
    }

    revalidatePath('/dev-checklist')
  } catch (error) {
    console.error('Error configuring JWKS:', error)
  }
}

/**
 * Retrieves the Neon project ID directly from the database connection
 */
async function getNeonProjectId() {
  try {
    if (!process.env.DATABASE_URL) {
      return { success: false, error: 'Database URL not configured' }
    }

    // Use the database client from the project
    const result = await db.execute(sql`SHOW neon.project_id`)

    console.log('Neon project ID:', result.rows[0]['neon.project_id'])
    if (result.rows.length > 0 && result.rows[0]['neon.project_id']) {
      return {
        success: true,
        projectId: result.rows[0]['neon.project_id'],
      }
    } else {
      return { success: false, error: 'Could not retrieve Neon project ID' }
    }
  } catch (error) {
    console.error(
      'Error getting Neon project ID:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
