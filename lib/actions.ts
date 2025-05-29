"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { todos, user_metrics, users_sync } from "@/drizzle/schema"
import { eq, desc, count, isNull } from "drizzle-orm"
import { getStripePlan } from "@/app/api/stripe/plans"
import { stackServerApp, getAccessToken } from "@/stack"
import { cookies } from "next/headers"
import { createNotification, watchTask, notifyWatchers, unwatchTask } from '@/app/api/notifications/notifications'

export async function getTodos() {
  const accessToken = await getAccessToken(await cookies())
  if (!accessToken) {
    throw new Error("Not authenticated")
  }

  try {
    const items =  await db.select().from(todos).orderBy(todos.id)
    console.log(items)
    return items
  } catch (error) {
    console.error("Failed to fetch todos:", error)
    return []
  }
}

export async function getTodo(id: number) {
  const accessToken = await getAccessToken(await cookies())
  if (!accessToken) {
    throw new Error("Not authenticated")
  }

  if (isNaN(id)) {
    throw new Error("Invalid todo ID")
  }

  try {
    const item = await db.query.todos.findFirst({
      where: eq(todos.id, id)
    })
    
    if (!item) {
      throw new Error("Todo not found")
    }
    
    return item
  } catch (error) {
    console.error("Failed to fetch todo:", error)
    throw error
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users_sync).where(isNull(users_sync.deleted_at)).orderBy(users_sync.name)
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return []
  }
}

export async function addTodo(formData: FormData) {
  const title = formData.get("text") as string
  const dueDateStr = formData.get("dueDate") as string | null

  if (!title?.trim()) {
    return { error: "Todo title is required" }
  }

  const user = await stackServerApp.getUser({ or: "redirect" })
  if (!user) {
    return { error: "User not found" }
  }

  try {
    let userMetrics = await db.query.user_metrics.findFirst({
      where: eq(user_metrics.userId, user.id),
    })

    if (!userMetrics) {
      const [newMetrics] = await db.insert(user_metrics).values({ userId: user.id, todosCreated: 0 }).returning()
      userMetrics = newMetrics
    }

    const totalTodos = await db
      .select({ count: count() })
      .from(todos)
      .then((result) => result[0]?.count ?? 0)

    const plan = await getStripePlan(user.id)
    if (totalTodos >= plan.todoLimit) {
      return { error: "You have reached your todo limit. Delete some todos to create new ones." }
    }

    const [todo] = await db.insert(todos).values({
      title,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      assignedToId: user.id,
    }).returning()

    await db
      .update(user_metrics)
      .set({
        todosCreated: userMetrics.todosCreated + 1,
        updatedAt: new Date(),
      })
      .where(eq(user_metrics.id, userMetrics.id))

    // Add creator as a watcher
    await watchTask({ 
      taskId: todo.id, 
      userId: user.id 
    })
    
    await createNotification({
      userId: user.id,
      type: "info",
      message: `New todo created: ${title}`,
      taskId: todo.id,
    })

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to add todo:", error)
    return { error: "Failed to add todo" }
  }
}

export async function getTotalCreatedTodos() {
  const accessToken = await getAccessToken(await cookies())
  if (!accessToken) {
    throw new Error("Not authenticated")
  }

  try {
    const result = await db.$withAuth(accessToken).select({ count: count() }).from(todos)
    return result[0]?.count ?? 0
  } catch (error) {
    console.error("Failed to count todos:", error)
    return 0
  }
}

export async function getCurrentUserTodosCreated() {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return 0
    }

    const userMetrics = await db.query.user_metrics.findFirst({
      where: eq(user_metrics.userId, user.id),
    })

    return userMetrics?.todosCreated ?? 0
  } catch (error) {
    console.error("Failed to get user's total created todos:", error)
    return 0
  }
}

export async function getUserTodoMetrics(userId: string) {
  try {
    // Get or create user metrics
    let userMetrics = await db.query.user_metrics.findFirst({
      where: eq(user_metrics.userId, userId),
    })

    if (!userMetrics) {
      // Create initial metrics record for user
      const [newMetrics] = await db.insert(user_metrics).values({ userId, todosCreated: 0 }).returning()
      userMetrics = newMetrics
    }

    // Get the user's plan details
    const plan = await getStripePlan(userId)

    return {
      todosCreated: userMetrics.todosCreated,
      todoLimit: plan.todoLimit,
      subscription: plan.id,
    }
  } catch (error) {
    console.error("Failed to get user todo metrics:", error)
    return { error: "Failed to get user metrics" }
  }
}

export async function resetUserTodosCreated(userId: string) {
  try {
    // Find the user metrics
    const userMetrics = await db.query.user_metrics.findFirst({
      where: eq(user_metrics.userId, userId),
    })

    if (userMetrics) {
      // Update existing metrics
      await db
        .update(user_metrics)
        .set({
          todosCreated: 0,
          updatedAt: new Date(),
        })
        .where(eq(user_metrics.id, userMetrics.id))
    } else {
      // Create new metrics with 0 todos
      await db.insert(user_metrics).values({ userId, todosCreated: 0 })
    }

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to reset user todos created count:", error)
    return { error: "Failed to reset todos created count" }
  }
}

export async function updateTodo(formData: FormData) {
  const id = formData.get('id')
  const title = formData.get('title')
  const description = formData.get('description')

  if (!id || typeof id !== 'string') {
    throw new Error('Invalid todo id')
  }

  const todoId = parseInt(id)
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  try {
    const [todo] = await db
      .update(todos)
      .set({
        title: title as string,
        description: description as string,
        updatedAt: new Date(),
      })
      .where(eq(todos.id, todoId))
      .returning()

    // Notify all watchers of the update
    await notifyWatchers({
      taskId: todo.id,
      message: `Todo updated: ${todo.title}`,
      type: "info"
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to update todo:', error)
    return { error: 'Failed to update todo' }
  }
}

// Add a new action to watch/unwatch todos
export async function toggleWatchTodo(formData: FormData) {
  const id = formData.get('id')
  const watch = formData.get('watch') === 'true'

  if (!id || typeof id !== 'string') {
    throw new Error('Invalid todo id')
  }

  const todoId = parseInt(id)
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  try {
    if (watch) {
      await watchTask({ 
        taskId: todoId, 
        userId: user.id 
      })
      await createNotification({
        userId: user.id,
        type: "info",
        message: "You are now watching this todo",
        taskId: todoId,
      })
    } else {
      await unwatchTask({ 
        taskId: todoId, 
        userId: user.id 
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to toggle watch status:', error)
    return { error: 'Failed to update watch status' }
  }
}
