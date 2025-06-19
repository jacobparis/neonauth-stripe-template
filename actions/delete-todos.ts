"use server"

import { db } from "@/lib/db"
import { todos, activities } from "@/drizzle/schema"
import { inArray, eq } from "drizzle-orm"
import { revalidatePath, revalidateTag } from "next/cache"
import { stackServerApp } from "@/stack"
import { createNotification } from '@/app/api/notifications/notifications'
import { nanoid } from 'nanoid'

// This function will be called by vercel-queue without user context
// or directly with auth context
export async function processDeleteTodos(ids: string[], userId: string) {
  // Filter out invalid IDs and optimistic todos (temp- prefix)
  const validIds = ids.filter((id) => id && id.length > 0 && !id.startsWith('temp-'))
  if (validIds.length === 0) return

  // When called via vercel-queue, use the passed userId 
  if (userId) {
    // Get the todos before deleting them
    const todosToDelete = await db.query.todos.findMany({
      where: inArray(todos.id, validIds)
    })

    // Soft delete the todos by setting deletedAt
    await db
      .update(todos)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(inArray(todos.id, validIds))

    // Create notifications for the deleted todos
    await Promise.all(
      todosToDelete.map(todo => 
        createNotification({
          userId,
          type: "warning",
          message: `Todo archived: ${todo.title}`,
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

    // Soft delete the todos by setting deletedAt
    await db
      .update(todos)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(inArray(todos.id, validIds))

    // Create notifications for the deleted todos
    await Promise.all(
      todosToDelete.map(todo => 
        createNotification({
          userId: user.id,
          type: "warning",
          message: `Todo archived: ${todo.title}`,
          taskId: todo.id,
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

// Toggle soft delete for a single todo
export async function toggleSoftDelete(formData: FormData) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  const id = formData.get('id') as string
  const deleted = formData.get('deleted') === 'true'

  if (!id) {
    throw new Error("Todo ID is required")
  }

  try {
    // Get the current todo to verify ownership
    const todo = await db.query.todos.findFirst({
      where: eq(todos.id, id)
    })

    if (!todo) {
      throw new Error("Todo not found")
    }

    if (todo.userId !== user.id) {
      throw new Error("Access denied")
    }

    // Update the todo
    await db
      .update(todos)
      .set({ 
        deletedAt: deleted ? new Date() : null,
        updatedAt: new Date() 
      })
      .where(eq(todos.id, id))

    // Create activity log
    const message = deleted ? 'Todo archived' : 'Todo restored from archive'
    await db.insert(activities).values({
      id: nanoid(8),
      content: message,
      todoId: id,
      userId: user.id,
    })

    // Create notification
    await createNotification({
      userId: user.id,
      type: deleted ? "warning" : "info",
      message: `${message}: ${todo.title}`,
      taskId: id,
    })

    revalidatePath("/app/todos")
    revalidatePath("/app/todos/archived")
    revalidateTag(`${user.id}:todos`)
    revalidateTag(`${user.id}:archived-todos`)

    return { success: true }
  } catch (error) {
    console.error("Failed to toggle soft delete:", error)
    throw error
  }
}
