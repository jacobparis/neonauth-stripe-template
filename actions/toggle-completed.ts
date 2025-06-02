"use server"

import { db } from "@/lib/db"
import { todos, comments } from "@/drizzle/schema"
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
    // Execute immediately instead of queuing
    await processToggleCompleted(ids, { completed, userId: user.id })
    return { success: true }
  } catch (error) {
    console.error("Failed to toggle todos:", error)
    return { error: "Failed to toggle todos" }
  }
}

export async function processToggleCompleted(ids: number[], payload: { completed: boolean, userId: string }) {
  // Filter out invalid IDs (optimistic todos)
  const validIds = ids.filter((id) => id > 0)
  if (validIds.length === 0) return

  // Get current todos to check for changes
  const currentTodos = await db.query.todos.findMany({
    where: inArray(todos.id, validIds)
  })

  // Update the todos
  const [updatedTodos] = await db
    .update(todos)
    .set({ completed: payload.completed })
    .where(inArray(todos.id, validIds))
    .returning()

  // Create activity comments for todos that actually changed
  for (const currentTodo of currentTodos) {
    if (currentTodo.completed !== payload.completed) {
      const completionComment = payload.completed ? "Marked as completed" : "Marked as incomplete"

      await db.insert(comments).values({
        content: completionComment,
        todoId: currentTodo.id,
        userId: payload.userId,
      })
    }
  }

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
