import { neon } from "@neondatabase/serverless"

// Create a SQL client using the DATABASE_URL environment variable
const sql = neon(process.env.DATABASE_URL)

export async function getUserFromNeonAuth(userId: string) {
  try {
    // Query the neon_auth.users_sync table for the user
    const user = await sql`
      SELECT * FROM neon_auth.users_sync 
      WHERE id = ${userId} AND deleted_at IS NULL
    `

    return user[0] || null
  } catch (error) {
    console.error("Error fetching user from Neon Auth:", error)
    return null
  }
}
