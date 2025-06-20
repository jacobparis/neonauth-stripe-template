"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { db } from "@/lib/db"
import { todos, users_sync, comments, activities } from "@/drizzle/schema"
import { eq, desc, count, isNull, and } from "drizzle-orm"
import { stackServerApp, getAccessToken } from "@/stack"
import { cookies } from "next/headers"
import { createNotification, watchTask, notifyWatchers, unwatchTask } from '@/app/api/notifications/notifications'
import { generateObject } from 'ai'
import { myProvider } from '@/lib/ai/providers'
import { format } from 'date-fns'
import { z } from 'zod'
import { checkMessageRateLimit } from '@/lib/rate-limit'
import { publishTask } from "@/app/api/queue/route"
import { nanoid } from 'nanoid'

// If the user has credits available, we'll prefill info in their todo based on the prompt
// otherwise just use it directly and give them a blank one
export async function generateTodoFromUserMessage({
  prompt,
}: {
  prompt: string;
}) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Fallback function to truncate prompt
  const fallbackToTruncatedPrompt = () => {
    return {
      title: prompt.trim().slice(0, 80),
      dueDate: undefined
    }
  }

  // Check if XAI_API_KEY exists
  if (!process.env.XAI_API_KEY) {
    return fallbackToTruncatedPrompt()
  }

  // Check rate limit before making LLM call
  const rateLimitResult = await checkMessageRateLimit(user.id)
  if (!rateLimitResult.success) {
    return fallbackToTruncatedPrompt()
  }

  const currentDate = new Date()

  try {
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
  } catch (error) {
    // If LLM call fails for any reason, fall back to truncated prompt
    console.error('LLM generation failed, falling back to truncated prompt:', error)
    return fallbackToTruncatedPrompt()
  }
}

export async function getTodos(userId: string) {
  try {
    const items = await db.select().from(todos).where(and(eq(todos.userId, userId), isNull(todos.deletedAt))).orderBy(todos.id)
    
    // Filter out overdue completed items (they should be archived)
    const now = new Date()
    const activeTodos = items.filter(todo => {
      // If it's completed and overdue, it should be archived
      if (todo.completed && todo.dueDate && todo.dueDate < now) {
        return false
      }
      return true
    })
    
    return activeTodos
  } catch (error) {
    console.error("Failed to fetch todos:", error)
    return []
  }
}

export async function getArchivedTodos(userId: string) {
  try {
    const items = await db.select().from(todos).where(eq(todos.userId, userId)).orderBy(todos.id)
    
    // Filter for archived items:
    // 1. Manually deleted (deletedAt is not null)
    // 2. Overdue completed items (completed=true AND dueDate < now)
    const now = new Date()
    const archivedItems = items.filter(todo => {
      // Manually deleted
      if (todo.deletedAt) {
        return true
      }
      
      // Overdue completed items
      if (todo.completed && todo.dueDate && todo.dueDate < now) {
        return true
      }
      
      return false
    })
    
    return archivedItems
  } catch (error) {
    console.error("Failed to fetch archived todos:", error)
    return []
  }
}

export async function getTodo({ userId, todoId }: { userId: string, todoId: string }) {

  console.log(userId, todoId)
  try {
    const item = await db.query.todos.findFirst({
      where: eq(todos.id, todoId)
    })
    
    if (!item) {
      throw new Error("Todo not found")
    }

    // Check ownership
    if (item.userId !== userId) {
      throw new Error("Access denied")
    }
    
    return item
  } catch (error) {
    console.error("Failed to fetch todo:", error)
    throw error
  }
}

export async function getUsers() {
  try {
    const result = await db.select().from(users_sync).where(isNull(users_sync.deleted_at)).orderBy(users_sync.name)
    return result
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return []
  }
}

export async function getUserById(userId: string) {
  console.log(userId)
  try {
    const result = await db
      .select()
      .from(users_sync)
      .where(and(eq(users_sync.id, userId), isNull(users_sync.deleted_at)))

    return result[0] || null
  } catch (error) {
    console.error("Failed to fetch user:", error)
    return null
  }
}

export async function addTodo(formData: FormData) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const text = formData.get('text') as string
  const dueDateStr = formData.get('dueDate') as string | null

  if (!text || typeof text !== 'string') {
    throw new Error('Text is required')
  }

  let dueDate: Date | null = null
  if (dueDateStr && dueDateStr.trim()) {
    dueDate = new Date(dueDateStr)
    if (isNaN(dueDate.getTime())) {
      dueDate = null
    }
  }

  const description = formData.get("description") as string | null

  if (!text?.trim()) {
    return { error: "Todo title is required" }
  }

  try {
    const [todo] = await db.insert(todos).values({
      id: nanoid(8),
      title: text,
      description: description?.trim() || null,
      dueDate: dueDate,
      userId: user.id,
    }).returning()

    // Add creator as a watcher
    await watchTask({ 
      taskId: todo.id, 
      userId: user.id 
    })
    
    await createNotification({
      userId: user.id,
      type: "info",
      message: `New todo created: ${text}`,
      taskId: todo.id,
    })

    // Queue AI description generation if no description was provided
    if (!description?.trim()) {
      await publishTask({
        type: "generateDescription",
        key: `generate-description-${todo.id}`,
        todoId: todo.id,
        title: text,
        userId: user.id,
      })
    }

    revalidateTag(`${user.id}:todos`)
    
    return { success: true }
  } catch (error) {
    console.error("Failed to add todo:", error)
    return { error: "Failed to add todo" }
  }
}

export async function getTotalCreatedTodos() {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  try {
    const result = await db.select({ count: count() }).from(todos).where(eq(todos.userId, user.id))
    return result[0]?.count ?? 0
  } catch (error) {
    console.error("Failed to count todos:", error)
    return 0
  }
}

export async function updateTodo(formData: FormData) {
  const id = formData.get('id')
  const title = formData.get('title')
  const description = formData.get('description')

  if (!id || typeof id !== 'string') {
    throw new Error('Invalid todo id')
  }

  const todoId = id
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

    // Check ownership
    if (currentTodo.userId !== user.id) {
      throw new Error("Access denied")
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

      // Log changes as activity instead of comment
      const changeComment = changes.join(', ')
      await db.insert(activities).values({
        id: nanoid(8),
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
    
    // Add cache tag revalidation
    revalidateTag(`${user.id}:todos`)
    revalidateTag(`${user.id}:archived-todos`)
    
    return
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

  const todoId = id
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  try {
    // Check if user owns the todo
    const todo = await db.query.todos.findFirst({
      where: eq(todos.id, todoId)
    })

    if (!todo) {
      throw new Error("Todo not found")
    }

    if (todo.userId !== user.id) {
      throw new Error("Access denied")
    }

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

// Overloaded getComments to optionally include activities
export async function getComments(arg1: any): Promise<any[]> {
  try {
    // Determine input signature
    let todoId: string
    let userId: string | undefined
    let includeActivity = false

    if (typeof arg1 === 'string') {
      todoId = arg1
      // If userId is not supplied, attempt to fetch from auth context
      const user = await stackServerApp.getUser()
      userId = user?.id
    } else {
      todoId = arg1.todoId
      userId = arg1.userId
      includeActivity = arg1.includeActivity ?? false
    }

    if (!todoId) {
      throw new Error("Todo ID is required")
    }

    // Ownership check when userId available
    if (userId) {
      const todo = await db.query.todos.findFirst({
        where: and(eq(todos.id, todoId), eq(todos.userId, userId))
      })
      if (!todo) {
        throw new Error("Todo not found")
      }
    }

    // Fetch comments
    const commentsList = await db.query.comments.findMany({
      where: eq(comments.todoId, todoId),
      with: {
        user: true
      },
      orderBy: comments.createdAt,
    })

    if (!includeActivity) {
      return commentsList
    }

    // Fetch activities and coerce to Comment shape
    const activitiesList = await db.query.activities.findMany({
      where: eq(activities.todoId, todoId),
      with: {
        user: true,
      },
      orderBy: activities.createdAt,
    }) as any[]

    // Add discriminator fields
    const commentsWithDiscriminator = commentsList.map(comment => ({
      ...comment,
      isActivity: false
    }))

    const activitiesWithDiscriminator = activitiesList.map(activity => ({
      ...activity,
      isActivity: true
    }))

    const result = [
      ...commentsWithDiscriminator,
      ...activitiesWithDiscriminator,
    ].sort((a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ) as any[]

    console.log('getComments result:', result.map(r => ({ 
      id: r.id, 
      content: r.content, 
      isActivity: r.isActivity,
      type: r.isActivity ? 'activity' : 'comment'
    })))

    return result
  } catch (error) {
    console.error("Failed to fetch comments:", error)
    return []
  }
}

export async function addComment(formData: FormData) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const content = formData.get('content')
  const todoId = formData.get('todoId')
  const isAiGenerated = formData.get('isAiGenerated') === 'true'

  if (!content || typeof content !== 'string') {
    throw new Error('Content is required')
  }

  if (!todoId || typeof todoId !== 'string') {
    throw new Error('Todo ID is required')
  }

  // Check if user owns the todo (only for human-generated comments)
  if (!isAiGenerated) {
    const todo = await db.query.todos.findFirst({
      where: eq(todos.id, todoId)
    })

    if (!todo) {
      throw new Error("Todo not found")
    }

    if (todo.userId !== user.id) {
      throw new Error("Access denied")
    }
  }

  // Only check rate limit for human-generated comments
  if (!isAiGenerated) {
    const rateLimitResult = await checkMessageRateLimit(user.id)
    if (!rateLimitResult.success) {
      const hoursUntilReset = Math.ceil(
        (rateLimitResult.reset - Date.now()) / (1000 * 60 * 60),
      )
      throw new Error(
        `Rate limit exceeded. You have ${rateLimitResult.remaining} messages remaining today. Resets in ${hoursUntilReset} hours.`,
      )
    }
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
      id: nanoid(8),
      content: content.trim(),
      todoId: todoId,
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
