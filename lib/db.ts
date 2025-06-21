import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '../drizzle/schema'
import { eq, isNull, and } from 'drizzle-orm'

export const db = process.env.DATABASE_URL
  ? drizzle(neon(process.env.DATABASE_URL), { schema })
  // Avoid errors before we set up the DB
  // Feel free to remove this once DATABASE_URL is set
  : (null as never)

export async function getUserFromNeonAuth(userId: string) {
  try {
    // Skip if database isn't configured
    if (!process.env.DATABASE_URL) {
      console.warn('Database not configured - skipping user fetch')
      return null
    }

    // Query the neon_auth.users_sync table for the user
    const users = await db
      .select()
      .from(schema.users_sync)
      .where(
        and(
          eq(schema.users_sync.id, userId),
          isNull(schema.users_sync.deleted_at),
        ),
      )

    return users[0] || null
  } catch (error) {
    console.error('Error fetching user from NeonAuth:', error)
    return null
  }
}
