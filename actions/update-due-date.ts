"use server"

import { db } from "@/lib/db"
import { todos, activities } from "@/drizzle/schema"
import { eq, inArray } from "drizzle-orm"
import { revalidatePath, revalidateTag } from "next/cache"
import { stackServerApp } from "@/stack"
import { createNotification } from '@/app/api/notifications/notifications'
import { nanoid } from 'nanoid'

export async function processUpdateDueDate({
  ids,
  dueDate,
  userId
}: {
  ids: string[]
  dueDate: Date | null
  userId: string
}) {
  // Filter out invalid IDs and optimistic todos (temp- prefix)
  const validIds = ids.filter((id) => id && id.length > 0 && !id.startsWith('temp-'))
  if (validIds.length === 0) return

  // When called via vercel-queue, use the passed userId
  if (userId) {
    // Get current todos to check for changes
    const currentTodos = await db.query.todos.findMany({
      where: inArray(todos.id, validIds)
    })

    const [updatedTodos] = await db
      .update(todos)
      .set({ dueDate })
      .where(inArray(todos.id, validIds))
      .returning()

    // Create activity comments for todos that actually changed
    for (const currentTodo of currentTodos) {
      const currentDueDateStr = currentTodo.dueDate?.toDateString()
      const newDueDateStr = dueDate?.toDateString()
      
      if (currentDueDateStr !== newDueDateStr) {
        const dueDateComment = dueDate 
          ? `Due date set to ${dueDate.toLocaleDateString()}`
          : "Due date removed"

        await db.insert(activities).values({
          id: nanoid(8),
          content: dueDateComment,
          todoId: currentTodo.id,
          userId,
        })
      }
    }

    // Create notifications for the updated todos
    await Promise.all(
      validIds.map(id => 
        createNotification({
          userId: userId!,
          type: "info",
          message: dueDate 
            ? `Due date updated to ${dueDate.toLocaleDateString()}`
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
    
    // Get current todos to check for changes
    const currentTodos = await db.query.todos.findMany({
      where: inArray(todos.id, validIds)
    })

    const [updatedTodos] = await db
      .update(todos)
      .set({ dueDate })
      .where(inArray(todos.id, validIds))
      .returning()

    // Create activity comments for todos that actually changed
    for (const currentTodo of currentTodos) {
      const currentDueDateStr = currentTodo.dueDate?.toDateString()
      const newDueDateStr = dueDate?.toDateString()
      
      if (currentDueDateStr !== newDueDateStr) {
        const dueDateComment = dueDate 
          ? `Due date set to ${dueDate.toLocaleDateString()}`
          : "Due date removed"

        await db.insert(activities).values({
          id: nanoid(8),
          content: dueDateComment,
          todoId: currentTodo.id,
          userId: user.id,
        })
      }
    }

    // Create notifications for the updated todos
    await Promise.all(
      validIds.map(id => 
        createNotification({
          userId: user.id,
          type: "info",
          message: dueDate 
            ? `Due date updated to ${dueDate.toLocaleDateString()}`
            : "Due date removed",
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

// Public action that handles both single and multiple updates
export async function updateDueDate({ 
  id, 
  ids, 
  dueDate 
}: { 
  id?: string
  ids?: string[]
  dueDate: Date | null 
}) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  // Get the IDs to update
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
    await processUpdateDueDate({ ids: todoIds, dueDate, userId: user.id })
    return { success: true }
  } catch (error) {
    console.error("Failed to update due dates:", error)
    return { error: "Failed to update due dates" }
  }
}

export async function bulkUpdateDueDate({ todoIds, dueDate }: { todoIds: string[], dueDate: Date | null }) {
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
