"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { todos, users_sync, comments } from "@/drizzle/schema"
import { eq, desc, count, isNull } from "drizzle-orm"
import { stackServerApp, getAccessToken } from "@/stack"
import { cookies } from "next/headers"
import { createNotification, watchTask, notifyWatchers, unwatchTask } from '@/app/api/notifications/notifications'
import { generateObject } from 'ai'
import { myProvider } from '@/lib/ai/providers'
import { format } from 'date-fns'
import { z } from 'zod'
import { checkMessageRateLimit } from '@/lib/rate-limit'
import { publishTask } from "@/app/api/queue/route"

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
    const result = await db.select().from(users_sync).where(isNull(users_sync.deleted_at)).orderBy(users_sync.name)
    return result
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return []
  }
}

export async function addTodo(formData: FormData) {
  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check rate limit first
  const rateLimitResult = await checkMessageRateLimit(user.id)
  if (!rateLimitResult.success) {
    const hoursUntilReset = Math.ceil(
      (rateLimitResult.reset - Date.now()) / (1000 * 60 * 60),
    )
    throw new Error(
      `Rate limit exceeded. You have ${rateLimitResult.remaining} messages remaining today. Resets in ${hoursUntilReset} hours.`,
    )
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
      title: text,
      description: description?.trim() || null,
      dueDate: dueDate,
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

  const todoIdNum = parseInt(todoId, 10)
  if (isNaN(todoIdNum)) {
    throw new Error('Invalid todo ID')
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
      content: content.trim(),
      todoId: todoIdNum,
      userId,
    }).returning()

    // Get the todo details for notifications
    const todo = await db.query.todos.findFirst({
      where: eq(todos.id, todoIdNum)
    })

    if (todo && !isAiGenerated) {
      // Only notify watchers for human comments, not AI responses
      // to avoid notification spam
      await notifyWatchers({
        taskId: todoIdNum,
        message: `${userName || 'Someone'} commented on "${todo.title}"`,
        type: "info"
      })
    }

    revalidatePath(`/app/todos/${todoIdNum}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to add comment:", error)
    return { error: "Failed to add comment" }
  }
}
