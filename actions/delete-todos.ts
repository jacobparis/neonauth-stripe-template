"use server"

import { db } from "@/lib/db"
import { todos } from "@/drizzle/schema"
import { inArray, eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { publishTask } from "@/app/api/queue/qstash"
import { stackServerApp } from "@/stack"
import { createNotification } from '@/app/api/notifications/notifications'

// This function will be called by QStash without user context
// or directly with auth context
export async function processDeleteTodos(ids: number[], userId?: string) {
  // Filter out invalid IDs (optimistic todos)
  const validIds = ids.filter((id) => id > 0)
  if (validIds.length === 0) return

  // When called via QStash, use the passed userId 
  if (userId) {
    // Get the todos before deleting them
    const todosToDelete = await db.query.todos.findMany({
      where: and(
        inArray(todos.id, validIds),
        eq(todos.assignedToId, userId)
      )
    })

    // Delete the todos
    await db
      .delete(todos)
      .where(
        and(
          inArray(todos.id, validIds),
          eq(todos.assignedToId, userId)
        )
      )

    // Create notifications for the deleted todos
    await Promise.all(
      todosToDelete.map(todo => 
        createNotification({
          userId,
          type: "warning",
          message: `Todo deleted: ${todo.title}`,
          taskId: todo.id,
        })
      )
    )
  } else {
    // This branch will be executed when called directly with auth
    const user = await stackServerApp.getUser()
    if (!user) {
      throw new Error("Not authenticated")
    }
    
    // Get the todos before deleting them
    const todosToDelete = await db.query.todos.findMany({
      where: and(
        inArray(todos.id, validIds),
        eq(todos.assignedToId, user.id)
      )
    })

    // Delete the todos
    await db
      .delete(todos)
      .where(
        and(
          inArray(todos.id, validIds),
          eq(todos.assignedToId, user.id)
        )
      )

    // Create notifications for the deleted todos
    await Promise.all(
      todosToDelete.map(todo => 
        createNotification({
          userId: user.id,
          type: "warning",
          message: `Todo deleted: ${todo.title}`,
          taskId: todo.id,
        })
      )
    )
  }

  revalidatePath("/app/todos")
  return { success: true }
}

// Public action that handles both single and multiple deletes
export async function deleteTodo(ids: number | number[]) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  // Convert single ID to array
  const todoIds = Array.isArray(ids) ? ids : [ids]
  
  try {
    // For small operations, do it immediately
    if (todoIds.length <= 10) {
      await processDeleteTodos(todoIds)
      return { success: true }
    }

    // For larger operations, queue it
    const job = await publishTask({
      type: "deleteTodos",
      key: `delete-todos-${todoIds.sort().join("-")}`,
      ids: todoIds,
      userId: user.id,
    })

    return { success: true, jobId: job.messageId }
  } catch (error) {
    console.error("Failed to delete todos:", error)
    return { error: "Failed to delete todos" }
  }
}
