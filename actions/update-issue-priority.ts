"use server"

import { db, issues } from "@/lib/db/schema"
import { stackServerApp } from "@/stack"
import { inArray, eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { publishTask } from "@/app/api/queue/qstash"

// This function will be called by QStash without user context
export async function processUpdatePriority(ids: number[], payload: { priority: string, userId?: string }) {
  // Filter out invalid IDs and ensure they exist
  const validIds = ids.filter((id) => id > 0)
  if (validIds.length === 0) return

  // Validate priority
  if (!["low", "medium", "high"].includes(payload.priority)) {
    throw new Error("Invalid priority value")
  }

  // When called via QStash, use the passed userId 
  if (payload.userId) {
    await db
      .update(issues)
      .set({
        priority: payload.priority,
        updated_at: new Date(),
      })
      .where(
        and(
          inArray(issues.id, validIds),
          eq(issues.user_id, payload.userId)
        )
      )
  } else {
    // This branch will be executed when called directly with auth
    const user = await stackServerApp.getUser()
    if (!user) {
      throw new Error("Not authenticated")
    }
    
    await db
      .update(issues)
      .set({
        priority: payload.priority,
        updated_at: new Date(),
      })
      .where(
        and(
          inArray(issues.id, validIds),
          eq(issues.user_id, user.id)
        )
      )
  }

  revalidatePath("/app")
}

export async function updateIssuePriority(id: number, priority: string) {
  // Don't try to update optimistic issues
  if (id < 0) return { success: false }

  try {
    await processUpdatePriority([id], { priority })
    
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

export async function bulkUpdatePriority(ids: number[], priority: string) {
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
      type: "updatePriority",
      key: `update-priority-${validIds.sort().join("-")}`,
      ids: validIds,
      priority,
      userId: user.id, // Pass the userId to the background task
    })

    return { 
      success: true, 
      message: `Updated ${validIds.length} issues to ${priority} priority`,
      jobId: job.messageId 
    }
  } catch (error) {
    console.error("Failed to bulk update priority:", error)
    return { 
      success: false,
      message: `Failed to set priority to ${priority}` 
    }
  }
}
