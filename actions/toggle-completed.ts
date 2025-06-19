"use server"

import { db } from "@/lib/db"
import { todos, activities } from "@/drizzle/schema"
import { eq, inArray } from "drizzle-orm"
import { revalidatePath, revalidateTag } from "next/cache"
import { stackServerApp } from "@/stack"
import { createNotification } from '@/app/api/notifications/notifications'
import { nanoid } from 'nanoid'


// Public action that handles both single and multiple toggles
export async function toggleTodoCompleted({ 
  id, 
  ids, 
  completed 
}: { 
  id?: string
  ids?: string[]
  completed: boolean 
}) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  // Handle both individual and bulk operations
  let todoIds: string[]
  if (id) {
    todoIds = [id]
  } else if (ids) {
    todoIds = ids
  } else {
    throw new Error("No todo IDs provided")
  }

  try {
    // Execute immediately instead of queuing
    await processToggleCompleted({ ids: todoIds, completed, userId: user.id })
    return { success: true }
  } catch (error) {
    console.error("Failed to toggle todos:", error)
    return { error: "Failed to toggle todos" }
  }
}

export async function processToggleCompleted({ ids, completed, userId }: { ids: string[], completed: boolean, userId: string }) {
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
    .set({ completed: completed })
    .where(inArray(todos.id, validIds))
    .returning()

  // Create activity comments for todos that actually changed
  for (const currentTodo of currentTodos) {
    if (currentTodo.completed !== completed) {
      const completionComment = completed ? "Marked as completed" : "Marked as incomplete"

      await db.insert(activities).values({
        id: nanoid(8),
        content: completionComment,
        todoId: currentTodo.id,
        userId: userId,
      })
    }
  }

  // Create notifications for the completed todos
  if (completed) {
    await Promise.all(
      validIds.map(id => 
        createNotification({
          userId: userId,
          type: "success",
          message: "Todo completed",
          taskId: id,
        })
      )
    )
  }

  // Match the exact cacheTag pattern from page servers
  revalidateTag(`${userId}:todos`)
  revalidateTag(`${userId}:archived-todos`)

  for (const id of validIds) {
    revalidateTag(`${userId}:todos:${id}`)
  }

  return { success: true }
}
