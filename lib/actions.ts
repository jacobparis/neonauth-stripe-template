"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { todos, user_metrics, users_sync, comments } from "@/drizzle/schema"
import { eq, desc, count, isNull } from "drizzle-orm"
import { getStripePlan } from "@/app/api/stripe/plans"
import { stackServerApp, getAccessToken } from "@/stack"
import { cookies } from "next/headers"
import { createNotification, watchTask, notifyWatchers, unwatchTask } from '@/app/api/notifications/notifications'
import { generateObject } from 'ai'
import { myProvider } from '@/lib/ai/providers'
import { format } from 'date-fns'
import { z } from 'zod'

export async function generateTodoFromUserMessage({
  prompt,
}: {
  prompt: string;
}) {
  const currentDate = new Date()

  const { object } = await generateObject({
    model: myProvider.languageModel('title-model'),
    schema: z.object({
      title: z.string().describe('A clear, actionable task title (max 80 characters)'),
      dueDate: z.string().optional().describe('ISO date string if a deadline is mentioned'),
    }),
    system: `You are extracting todo information from user input.
    
Current date: ${format(currentDate, 'PPP')} (${format(currentDate, 'EEEE')})

Rules:
- Generate a clear, actionable title (max 80 characters)
- If a due date/deadline is mentioned, parse it relative to today and return as ISO string
- Examples: "tomorrow" = next day, "Friday" = next Friday, "next week" = 7 days from now`,
    prompt: prompt,
  });

  return object;
}

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

export async function getUsersWithProfiles() {
  try {
    const dbUsers = await db.select().from(users_sync).where(isNull(users_sync.deleted_at)).orderBy(users_sync.name)
    
    // For each user, try to get their Stack Auth profile
    const usersWithProfiles = await Promise.all(
      dbUsers.map(async (dbUser) => {
        try {
          // Get the Stack Auth user data for profile image
          const stackUser = await stackServerApp.getUser(dbUser.id)
          return {
            ...dbUser,
            profileImageUrl: stackUser?.profileImageUrl || null,
          }
        } catch (error) {
          // If we can't get Stack Auth data, just use database data
          return {
            ...dbUser,
            profileImageUrl: null,
          }
        }
      })
    )
    
    return usersWithProfiles
  } catch (error) {
    console.error("Failed to fetch users with profiles:", error)
    return []
  }
}

export async function addTodo(formData: FormData) {
  const title = formData.get("text") as string
  const description = formData.get("description") as string | null
  const dueDateStr = formData.get("dueDate") as string | null
  const assignedToId = formData.get("assignedToId") as string | null

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
      description: description?.trim() || null,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      assignedToId: assignedToId || user.id,
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
    // Get the current todo to compare changes
    const currentTodo = await db.query.todos.findFirst({
      where: eq(todos.id, todoId)
    })

    if (!currentTodo) {
      throw new Error("Todo not found")
    }

    // Only update fields that are provided
    const updateData: any = {
      updatedAt: new Date(),
    }
    
    const changes: string[] = []

    if (title !== null && title !== currentTodo.title) {
      updateData.title = title as string
      changes.push(`Title changed to "${title}"`)
    }
    
    if (description !== null && description !== currentTodo.description) {
      updateData.description = description as string
      if (description) {
        changes.push(`Description updated`)
      } else {
        changes.push(`Description removed`)
      }
    }

    if (changes.length > 0) {
      const [todo] = await db
        .update(todos)
        .set(updateData)
        .where(eq(todos.id, todoId))
        .returning()

      // Add activity comment for the changes
      const changeComment = changes.join(', ')
      await db.insert(comments).values({
        content: changeComment,
        todoId,
        userId: user.id,
      })

      // Notify all watchers of the update
      await notifyWatchers({
        taskId: todo.id,
        message: `Todo updated: ${todo.title}`,
        type: "info"
      })
    }

    revalidatePath('/')
  } catch (error) {
    console.error('Failed to update todo:', error)
    throw new Error('Failed to update todo')
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

export async function getComments(todoId: number) {
  const accessToken = await getAccessToken(await cookies())
  if (!accessToken) {
    throw new Error("Not authenticated")
  }

  try {
    const commentList = await db.query.comments.findMany({
      where: eq(comments.todoId, todoId),
      with: {
        user: true
      },
      orderBy: comments.createdAt
    })
    
    return commentList
  } catch (error) {
    console.error("Failed to fetch comments:", error)
    return []
  }
}

export async function addComment(formData: FormData) {
  const content = formData.get("content") as string
  const todoId = parseInt(formData.get("todoId") as string)
  const isAiGenerated = formData.get("isAiGenerated") === "true"

  if (!content?.trim()) {
    return { error: "Comment content is required" }
  }

  if (isNaN(todoId)) {
    return { error: "Invalid todo ID" }
  }

  let userId: string
  let userName: string | null = null

  if (isAiGenerated) {
    // For AI-generated comments, use a special AI user ID
    userId = 'ai-assistant'
    userName = 'AI Assistant'
    
    // Ensure AI user exists in users_sync table
    await db.insert(users_sync).values({
      id: 'ai-assistant',
      email: 'ai@assistant.local',
      name: 'AI Assistant',
      image: null,
    }).onConflictDoUpdate({
      target: users_sync.id,
      set: {
        email: 'ai@assistant.local',
        name: 'AI Assistant',
        image: null,
        updated_at: new Date(),
      }
    })
  } else {
    // For regular comments, use the authenticated user
    const user = await stackServerApp.getUser()
    if (!user) {
      return { error: "User not found" }
    }
    
    userId = user.id
    userName = user.displayName

    // Ensure user exists in users_sync table
    await db.insert(users_sync).values({
      id: user.id,
      email: user.primaryEmail?.slice(0, 255) || null,
      name: user.displayName?.slice(0, 255) || null,
      image: null, // Don't store large base64 images in DB
    }).onConflictDoUpdate({
      target: users_sync.id,
      set: {
        email: user.primaryEmail?.slice(0, 255) || null,
        name: user.displayName?.slice(0, 255) || null,
        image: null, // Don't store large base64 images in DB
        updated_at: new Date(),
      }
    })
  }

  try {
    const [comment] = await db.insert(comments).values({
      content: content.trim(),
      todoId,
      userId,
    }).returning()

    // Get the todo details for notifications
    const todo = await db.query.todos.findFirst({
      where: eq(todos.id, todoId)
    })

    if (todo && !isAiGenerated) {
      // Only notify watchers for human comments, not AI responses
      // to avoid notification spam
      await notifyWatchers({
        taskId: todoId,
        message: `${userName || 'Someone'} commented on "${todo.title}"`,
        type: "info"
      })
    }

    revalidatePath(`/app/todos/${todoId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to add comment:", error)
    return { error: "Failed to add comment" }
  }
}

export async function updateTodoAssignment(formData: FormData) {
  const id = formData.get('id')
  const assignedToId = formData.get('assignedToId') as string | null

  if (!id || typeof id !== 'string') {
    throw new Error('Invalid todo id')
  }

  const todoId = parseInt(id)
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  try {
    // Get the current todo to compare changes
    const currentTodo = await db.query.todos.findFirst({
      where: eq(todos.id, todoId)
    })

    if (!currentTodo) {
      throw new Error("Todo not found")
    }

    // Only update if assignment actually changed
    if (assignedToId !== currentTodo.assignedToId) {
      const [todo] = await db
        .update(todos)
        .set({ 
          assignedToId: assignedToId || null,
          updatedAt: new Date(),
        })
        .where(eq(todos.id, todoId))
        .returning()

      // Add activity comment for the assignment change
      let assignmentComment: string
      if (assignedToId) {
        const assignedUser = await stackServerApp.getUser(assignedToId)
        assignmentComment = `Assigned to ${assignedUser?.displayName || assignedUser?.primaryEmail || 'someone'}`
      } else {
        assignmentComment = 'Unassigned'
      }

      await db.insert(comments).values({
        content: assignmentComment,
        todoId,
        userId: user.id,
      })

      // Notify all watchers of the assignment change
      await notifyWatchers({
        taskId: todo.id,
        message: assignmentComment,
        type: "info"
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to update todo assignment:', error)
    return { error: 'Failed to update todo assignment' }
  }
}
