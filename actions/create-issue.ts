"use server"

import { db, issues } from "@/lib/db/schema"
import { stackServerApp } from "@/stack"
import { revalidatePath } from "next/cache"
import { getStripePlan } from "@/app/api/stripe/plans"
import { eq } from "drizzle-orm"

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
