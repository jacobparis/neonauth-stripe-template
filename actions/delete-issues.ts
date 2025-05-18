"use server"

import { db, issues } from "@/lib/db/schema"
import { stackServerApp } from "@/stack"
import { inArray, eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { publishTask } from "@/app/api/queue/qstash"

// This function will be called by QStash without user context
export async function processDeleteIssues(ids: number[], userId?: string) {
  // Filter out invalid IDs and ensure they exist
  const validIds = ids.filter((id) => id > 0)
  if (validIds.length === 0) return

  // When called via QStash, use the passed userId 
  if (userId) {
    await db
      .delete(issues)
      .where(
        and(
          inArray(issues.id, validIds),
          eq(issues.user_id, userId)
        )
      )
  } else {
    // This branch will be executed when called directly with auth
    const user = await stackServerApp.getUser()
    if (!user) {
      throw new Error("Not authenticated")
    }
    
    await db
      .delete(issues)
      .where(
        and(
          inArray(issues.id, validIds),
          eq(issues.user_id, user.id)
        )
      )
  }

  revalidatePath("/app")
}

export async function deleteIssue(id: number) {
  // Don't try to delete optimistic issues
  if (id < 0) return { success: false }

  try {
    await processDeleteIssues([id])
    
    return {
      success: true,
      message: "Issue deleted successfully",
    }
  } catch (error) {
    console.error("Error deleting issue:", error)
    return {
      success: false,
      message: "Failed to delete issue",
    }
  }
}

export async function bulkDeleteIssues(ids: number[]) {
  // Get user authentication first, before queuing task
  const user = await stackServerApp.getUser()
  if (!user) {
    return { 
      success: false,
      message: "Not authenticated" 
    }
  }

  // Filter out any negative IDs (optimistic issues)
  const validIds = ids.filter((id) => id > 0)
  if (validIds.length === 0) return { success: false }

  try {
    const job = await publishTask({
      type: "deleteIssues",
      key: `delete-issues-${validIds.sort().join("-")}`,
      ids: validIds,
      userId: user.id, // Pass the userId to the background task
    })

    return { 
      success: true, 
      message: `Deleted ${validIds.length} issues`,
      jobId: job.messageId 
    }
  } catch (error) {
    console.error("Failed to bulk delete issues:", error)
    return { 
      success: false,
      message: "Failed to delete issues" 
    }
  }
} 
