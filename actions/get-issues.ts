"use server"

import { db, issues } from "@/lib/db/schema"
import { stackServerApp } from "@/stack"
import { eq, desc } from "drizzle-orm"

export async function getIssues() {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  try {
    // Simplified query without complex SQL expressions
    const result = await db.select().from(issues).where(eq(issues.user_id, user.id)).orderBy(desc(issues.created_at))

    // Safely handle date values - don't try to convert them
    // The dates are already in the correct format from the database
    return result.map((issue) => ({
      ...issue
    }))
  } catch (error) {
    console.error("Error fetching issues:", error)
    return []
  }
}

export async function getIssueCount() {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  try {
    // Use a simpler approach to count issues
    // Just fetch all issues for the user and count them in JavaScript
    const result = await db.select().from(issues).where(eq(issues.user_id, user.id))
    return result.length
  } catch (error) {
    console.error("Error counting issues:", error)
    return 0
  }
} 
