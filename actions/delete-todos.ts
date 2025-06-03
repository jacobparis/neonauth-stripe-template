"use server"

import { db } from "@/lib/db"
import { todos } from "@/drizzle/schema"
import { inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { stackServerApp } from "@/stack"
import { createNotification } from '@/app/api/notifications/notifications'

// This function will be called by vercel-queue without user context
// or directly with auth context
export async function processDeleteTodos(ids: string[], userId?: string) {
  // Filter out invalid IDs and optimistic todos (temp- prefix)
  const validIds = ids.filter((id) => id && id.length > 0 && !id.startsWith('temp-'))
  if (validIds.length === 0) return

  // When called via vercel-queue, use the passed userId 
  if (userId) {
    // Get the todos before deleting them
    const todosToDelete = await db.query.todos.findMany({
      where: inArray(todos.id, validIds)
    })

    // Delete the todos
    await db
      .delete(todos)
      .where(inArray(todos.id, validIds))

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
      where: inArray(todos.id, validIds)
    })

    // Delete the todos
    await db
      .delete(todos)
      .where(inArray(todos.id, validIds))

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
export async function deleteTodo(ids: string | string[]) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  // Convert single ID to array
  const todoIds = Array.isArray(ids) ? ids : [ids]
  
  try {
    // Execute immediately instead of queuing
    await processDeleteTodos(todoIds)
    return { success: true }
  } catch (error) {
    console.error("Failed to delete todos:", error)
    return { error: "Failed to delete todos" }
  }
}
