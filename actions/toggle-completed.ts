"use server"

import { db } from "@/lib/db"
import { todos, activities } from "@/drizzle/schema"
import { eq, inArray } from "drizzle-orm"
import { revalidatePath, revalidateTag } from "next/cache"
import { stackServerApp } from "@/stack"
import { createNotification } from '@/app/api/notifications/notifications'
import { nanoid } from 'nanoid'


// Public action that handles both single and multiple toggles
export async function toggleTodoCompleted(formData: FormData) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  // Handle both individual and bulk operations
  let ids: string[]
  const idsFromJson = formData.get("ids")
  const idsFromIndividual = formData.getAll("id")
  
  if (idsFromJson) {
    // Bulk operation - ids sent as JSON string
    ids = JSON.parse(idsFromJson as string)
  } else if (idsFromIndividual.length > 0) {
    // Individual operation - ids sent as multiple form fields
    ids = idsFromIndividual.map(id => id as string)
  } else {
    throw new Error("No todo IDs provided")
  }

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

export async function processToggleCompleted(ids: string[], payload: { completed: boolean, userId: string }) {
  // Filter out invalid IDs and optimistic todos (temp- prefix)
  const validIds = ids.filter((id) => id && id.length > 0 && !id.startsWith('temp-'))
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

      await db.insert(activities).values({
        id: nanoid(8),
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

  if (payload.userId) {
    // Match the exact cacheTag pattern from page servers
    revalidateTag(`${payload.userId}:todos`)
    revalidateTag(`${payload.userId}:archived-todos`)
  }
  
  return { success: true }
}
