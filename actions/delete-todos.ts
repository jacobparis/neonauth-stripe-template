'use server'

import { db } from '@/lib/db'
import { todos, activities } from '@/drizzle/schema'
import { inArray, eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { stackServerApp } from '@/stack'
import { createNotification } from '@/app/api/notifications/notifications'
import { nanoid } from 'nanoid'

// This function will be called by vercel-queue without user context
// or directly with auth context
export async function processDeleteTodos({
  ids,
  userId,
  isDeleted = true,
}: {
  ids: string[]
  userId: string
  isDeleted?: boolean
}) {
  // Filter out invalid IDs and optimistic todos (temp- prefix)
  const validIds = ids.filter(
    (id) => id && id.length > 0 && !id.startsWith('temp-'),
  )
  if (validIds.length === 0) return

  // Get the todos before deleting them
  const todosToDelete = await db.query.todos.findMany({
    where: inArray(todos.id, validIds),
  })

  const currentDate = new Date()

  // Soft delete the todos by setting deletedAt
  await db
    .update(todos)
    .set({
      deletedAt: isDeleted ? currentDate : null,
      updatedAt: currentDate,
    })
    .where(inArray(todos.id, validIds))

  // Create notifications for the deleted todos
  await Promise.all(
    todosToDelete.map((todo) =>
      createNotification({
        userId,
        type: 'warning',
        message: `Todo archived: ${todo.title}`,
        taskId: todo.id,
      }),
    ),
  )

  // Create activity log
  const message = isDeleted ? 'Todo archived' : 'Todo restored from archive'
  await db.insert(activities).values(
    todosToDelete.map((todo) => ({
      id: nanoid(8),
      content: message,
      todoId: todo.id,
      userId: userId,
    })),
  )

  // Create notification
  await Promise.all(
    todosToDelete.map((todo) =>
      createNotification({
        userId: userId,
        type: isDeleted ? 'warning' : 'info',
        message: `${message}: ${todo.title}`,
        taskId: todo.id,
      }),
    ),
  )

  // Match the exact cacheTag pattern from page servers
  revalidateTag(`${userId}:todos`)
  revalidateTag(`${userId}:archived-todos`)

  for (const id of validIds) {
    revalidateTag(`${userId}:todos:${id}`)
  }

  return { success: true }
}

// Public action that handles both single and multiple deletes
export async function deleteTodo({ ids, isDeleted = true }: { ids: string | string[], isDeleted?: boolean }) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const todoIds = Array.isArray(ids) ? ids : [ids]

  try {
    await processDeleteTodos({ ids: todoIds, userId: user.id, isDeleted })
    return { success: true }
  } catch (error) {
    console.error('Failed to delete todos:', error)
    return { error: 'Failed to delete todos' }
  }
}
