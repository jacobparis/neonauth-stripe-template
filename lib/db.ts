import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { remember } from "@epic-web/remember"
import * as schema from "./schema"
import { eq, isNull, and } from "drizzle-orm"

// Create a Drizzle ORM instance
export const db = remember("db", () => {
  return drizzle(neon(process.env.DATABASE_URL!), { schema })
})

export async function getUserFromNeonAuth(userId: string) {
  try {
    // Query the neon_auth.users_sync table for the user
    const users = await db.select()
      .from(schema.users_sync)
      .where(
        and(
          eq(schema.users_sync.id, userId),
          isNull(schema.users_sync.deleted_at)
        )
      )

    return users[0] || null
  } catch (error) {
    console.error("Error fetching user from Neon Auth:", error)
    return null
  }
}
