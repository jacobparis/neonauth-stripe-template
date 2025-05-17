"use server"

import { db, issues } from "@/lib/db/schema"
import { stackServerApp } from "@/stack"
import { revalidatePath } from "next/cache"
import { getStripePlan } from "@/app/api/stripe/plans"
import { eq, and, desc } from "drizzle-orm"

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
      ...issue,
      // Ensure created_at and updated_at are ISO strings
      created_at: issue.created_at ? new Date(issue.created_at).toISOString() : null,
      updated_at: issue.updated_at ? new Date(issue.updated_at).toISOString() : null,
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

export async function createIssue(formData: FormData) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  try {
    // Check if user has reached their limit
    const plan = await getStripePlan(user.id)
    const currentCount = await getIssueCount()

    if (plan.id === "FREE" && currentCount >= 10) {
      return {
        success: false,
        message: "Free plan is limited to 10 issues. Upgrade to Pro for unlimited issues.",
      }
    }

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const priority = (formData.get("priority") as string) || "medium"

    if (!title) {
      return {
        success: false,
        message: "Title is required",
      }
    }

    // Validate priority
    if (!["low", "medium", "high"].includes(priority)) {
      return {
        success: false,
        message: "Invalid priority value",
      }
    }

    await db.insert(issues).values({
      title,
      description,
      priority,
      status: "open", // Default status
      user_id: user.id,
    })

    revalidatePath("/app")
    return {
      success: true,
      message: "Issue created successfully",
    }
  } catch (error) {
    console.error("Error creating issue:", error)
    return {
      success: false,
      message: "Failed to create issue. Please try again.",
    }
  }
}

export async function updateIssueStatus(id: number, status: string) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  // Validate status
  if (!["open", "in_progress", "closed"].includes(status)) {
    return {
      success: false,
      message: "Invalid status value",
    }
  }

  try {
    await db
      .update(issues)
      .set({
        status,
        updated_at: new Date(),
      })
      .where(and(eq(issues.id, id), eq(issues.user_id, user.id)))

    revalidatePath("/app")
    return {
      success: true,
      message: "Issue status updated",
    }
  } catch (error) {
    console.error("Error updating issue status:", error)
    return {
      success: false,
      message: "Failed to update issue status",
    }
  }
}

export async function updateIssuePriority(id: number, priority: string) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  // Validate priority
  if (!["low", "medium", "high"].includes(priority)) {
    return {
      success: false,
      message: "Invalid priority value",
    }
  }

  try {
    await db
      .update(issues)
      .set({
        priority,
        updated_at: new Date(),
      })
      .where(and(eq(issues.id, id), eq(issues.user_id, user.id)))

    revalidatePath("/app")
    return {
      success: true,
      message: "Issue priority updated",
    }
  } catch (error) {
    console.error("Error updating issue priority:", error)
    return {
      success: false,
      message: "Failed to update issue priority",
    }
  }
}

export async function deleteIssue(id: number) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  try {
    await db.delete(issues).where(and(eq(issues.id, id), eq(issues.user_id, user.id)))

    revalidatePath("/app")
    return {
      success: true,
      message: "Issue deleted",
    }
  } catch (error) {
    console.error("Error deleting issue:", error)
    return {
      success: false,
      message: "Failed to delete issue",
    }
  }
}
