"use server"

import { db } from "@/lib/db"
import { todos } from "@/drizzle/schema"
import { eq, inArray, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { publishTask } from "@/app/api/queue/qstash"
import { stackServerApp } from "@/stack"
import { createNotification } from '@/app/api/notifications/notifications'

// This function will be called by QStash without user context
// or directly with auth context
export async function processUpdateDueDate(ids: number[], payload: { dueDate: Date | null, userId?: string }) {
  // Filter out invalid IDs (optimistic todos)
  const validIds = ids.filter((id) => id > 0)
  if (validIds.length === 0) return

  // When called via QStash, use the passed userId 
  if (payload.userId) {
    const [updatedTodos] = await db
      .update(todos)
      .set({ dueDate: payload.dueDate })
      .where(
        and(
          inArray(todos.id, validIds),
          eq(todos.assignedToId, payload.userId)
        )
      )
      .returning()

    // Create notifications for the updated todos
    await Promise.all(
      validIds.map(id => 
        createNotification({
          userId: payload.userId!,
          type: "info",
          message: payload.dueDate 
            ? `Due date updated to ${payload.dueDate.toLocaleDateString()}`
            : "Due date removed",
          taskId: id,
        })
      )
    )
  } else {
    // This branch will be executed when called directly with auth
    const user = await stackServerApp.getUser()
    if (!user) {
      throw new Error("Not authenticated")
    }
    
    const [updatedTodos] = await db
      .update(todos)
      .set({ dueDate: payload.dueDate })
      .where(
        and(
          inArray(todos.id, validIds),
          eq(todos.assignedToId, user.id)
        )
      )
      .returning()

    // Create notifications for the updated todos
    await Promise.all(
      validIds.map(id => 
        createNotification({
          userId: user.id,
          type: "info",
          message: payload.dueDate 
            ? `Due date updated to ${payload.dueDate.toLocaleDateString()}`
            : "Due date removed",
          taskId: id,
        })
      )
    )
  }

  revalidatePath("/app/todos")
  return { success: true }
}

// Public action that handles both single and multiple updates
export async function updateDueDate(formData: FormData) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  // Parse the form data
  const id = formData.get("id")
  const ids = formData.get("ids")
  const dueDateStr = formData.get("dueDate") as string | null
  const dueDate = dueDateStr ? new Date(dueDateStr) : null

  // Get the IDs to update
  let todoIds: number[]
  if (id) {
    todoIds = [Number(id)]
  } else if (ids) {
    todoIds = JSON.parse(ids as string)
  } else {
    throw new Error("No todo IDs provided")
  }

  try {
    // For small operations, do it immediately
    if (todoIds.length <= 10) {
      await processUpdateDueDate(todoIds, { dueDate })
      return { success: true }
    }

    // For larger operations, queue it
    const job = await publishTask({
      type: "updateDueDate",
      key: `update-due-date-${todoIds.sort().join("-")}`,
      ids: todoIds,
      dueDate: dueDate?.toISOString() || null,
      userId: user.id,
    })

    return { success: true, jobId: job.messageId }
  } catch (error) {
    console.error("Failed to update due dates:", error)
    return { error: "Failed to update due dates" }
  }
}

export async function bulkUpdateDueDate(todoIds: number[], dueDate: Date | null) {
  if (!todoIds.length) {
    return { success: true }
  }

  try {
    // For simplicity, we'll update one by one
    // In a real implementation, you might use a WHERE IN clause
    for (const id of todoIds) {
      await db.update(todos)
        .set({ dueDate })
        .where(eq(todos.id, id))
    }
    
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to update due dates:", error)
    return { error: "Failed to update due dates" }
  }
}
