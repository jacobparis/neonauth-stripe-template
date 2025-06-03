"use server"

import { db } from "@/lib/db"
import { todos, comments } from "@/drizzle/schema"
import { eq, inArray, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { stackServerApp } from "@/stack"
import { createNotification } from '@/app/api/notifications/notifications'

// This function will be called by vercel-queue without user context
// or directly with auth context
export async function processUpdateDueDate(
  ids: number[],
  args: { dueDate: Date | null; userId?: string }
) {
  // Filter out invalid IDs (optimistic todos)
  const validIds = ids.filter((id) => id > 0)
  if (validIds.length === 0) return

  // When called via vercel-queue, use the passed userId
  if (args.userId) {
    // Get current todos to check for changes
    const currentTodos = await db.query.todos.findMany({
      where: inArray(todos.id, validIds)
    })

    const [updatedTodos] = await db
      .update(todos)
      .set({ dueDate: args.dueDate })
      .where(inArray(todos.id, validIds))
      .returning()

    // Create activity comments for todos that actually changed
    for (const currentTodo of currentTodos) {
      const currentDueDateStr = currentTodo.dueDate?.toDateString()
      const newDueDateStr = args.dueDate?.toDateString()
      
      if (currentDueDateStr !== newDueDateStr) {
        const dueDateComment = args.dueDate 
          ? `Due date set to ${args.dueDate.toLocaleDateString()}`
          : "Due date removed"

        await db.insert(comments).values({
          content: dueDateComment,
          todoId: currentTodo.id,
          userId: args.userId,
        })
      }
    }

    // Create notifications for the updated todos
    await Promise.all(
      validIds.map(id => 
        createNotification({
          userId: args.userId!,
          type: "info",
          message: args.dueDate 
            ? `Due date updated to ${args.dueDate.toLocaleDateString()}`
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
      .set({ dueDate: args.dueDate })
      .where(inArray(todos.id, validIds))
      .returning()

    // Create activity comments for todos that actually changed
    for (const currentTodo of currentTodos) {
      const currentDueDateStr = currentTodo.dueDate?.toDateString()
      const newDueDateStr = args.dueDate?.toDateString()
      
      if (currentDueDateStr !== newDueDateStr) {
        const dueDateComment = args.dueDate 
          ? `Due date set to ${args.dueDate.toLocaleDateString()}`
          : "Due date removed"

        await db.insert(comments).values({
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
          message: args.dueDate 
            ? `Due date updated to ${args.dueDate.toLocaleDateString()}`
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
    // Execute immediately instead of queuing
    await processUpdateDueDate(todoIds, { dueDate })
    return { success: true }
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
