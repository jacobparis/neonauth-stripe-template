"use server"

import { db } from "@/lib/db"
import { todos } from "@/drizzle/schema"
import { eq, inArray, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { publishTask } from "@/app/api/queue/qstash"
import { stackServerApp } from "@/stack"
import { createNotification } from '@/app/api/notifications/notifications'


// Public action that handles both single and multiple toggles
export async function toggleTodoCompleted(formData: FormData) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  const ids = formData.getAll("id").map(id => Number(id))
  const completed = formData.get("completed") === "true"



  try {
    // For small operations, do it immediately
    if (ids.length <= 10) {
      await processToggleCompleted(ids, { completed, userId: user.id })
      return { success: true }
    }

    // For larger operations, queue it
    const job = await publishTask({
      type: "toggleCompleted",
      key: `toggle-completed-${ids.sort().join("-")}`,
      ids: ids,
      completed,
      userId: user.id,
    })

    return { success: true, jobId: job.messageId }
  } catch (error) {
    console.error("Failed to toggle todos:", error)
    return { error: "Failed to toggle todos" }
  }
}

export async function processToggleCompleted(ids: number[], payload: { completed: boolean, userId: string }) {
  // Filter out invalid IDs (optimistic todos)
  const validIds = ids.filter((id) => id > 0)
  if (validIds.length === 0) return

  // When called via QStash, use the passed userId 
  const [updatedTodos] = await db
    .update(todos)
    .set({ completed: payload.completed })
    .where(
      and(
        inArray(todos.id, validIds),
        eq(todos.assignedToId, payload.userId)
      )
    )
    .returning()

  // Create notifications for the completed todos
  if (payload.completed) {
    await Promise.all(
      validIds.map(id => 
        createNotification({
          userId: payload.userId,
          type: "success",
          message: "Todo completed",
          taskId: id,
        })
      )
    )
  }

  revalidatePath("/app/todos")
  return { success: true }
}
