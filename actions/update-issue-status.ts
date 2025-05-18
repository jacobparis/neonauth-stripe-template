"use server"

import { db, issues } from "@/lib/db/schema"
import { stackServerApp } from "@/stack"
import { inArray, eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { publishTask } from "@/app/api/queue/qstash"

// This function will be called by QStash without user context
export async function processUpdateStatus(ids: number[], payload: { status: string, userId?: string }) {
  // Filter out invalid IDs and ensure they exist
  const validIds = ids.filter((id) => id > 0)
  if (validIds.length === 0) return

  // Validate status
  if (!["open", "in_progress", "closed"].includes(payload.status)) {
    throw new Error("Invalid status value")
  }

  // When called via QStash, use the passed userId 
  if (payload.userId) {
    await db
      .update(issues)
      .set({
        status: payload.status,
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
        status: payload.status,
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

export async function updateIssueStatus(id: number, status: string) {
  // Don't try to update optimistic issues
  if (id < 0) return { success: false }

  try {
    await processUpdateStatus([id], { status })
    
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

export async function bulkUpdateStatus(ids: number[], status: string) {
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
      type: "updateStatus",
      key: `update-status-${validIds.sort().join("-")}`,
      ids: validIds,
      status,
      userId: user.id, // Pass the userId to the background task
    })

    return { 
      success: true, 
      message: `Updated ${validIds.length} issues to ${status.replace("_", " ")}`,
      jobId: job.messageId 
    }
  } catch (error) {
    console.error("Failed to bulk update status:", error)
    return { 
      success: false,
      message: `Failed to mark issues as ${status.replace("_", " ")}` 
    }
  }
}
