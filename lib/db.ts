import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { remember } from "@epic-web/remember"
import * as schema from "./schema"
import { eq, isNull, and } from "drizzle-orm"

// Create a lazy Drizzle ORM instance that only connects when needed
export const db = remember("db", () => {
  // Real DB connection when DATABASE_URL is available
  return drizzle(neon(process.env.DATABASE_URL!), { schema })
})

export async function getUserFromNeonAuth(userId: string) {
  try {
    // Skip if database isn't configured
    if (!process.env.DATABASE_URL) {
      console.warn("Database not configured - skipping user fetch")
      return null
    }

    // Query the neon_auth.users_sync table for the user
    const users = await db
      .select()
      .from(schema.users_sync)
      .where(and(eq(schema.users_sync.id, userId), isNull(schema.users_sync.deleted_at)))

    return users[0] || null
  } catch (error) {
    console.error("Error fetching user from NeonAuth:", error)
    return null
  }
}
