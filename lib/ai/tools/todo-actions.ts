import { tool } from 'ai'
import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { todos, activities } from '@/drizzle/schema'
import { notifyWatchers } from '@/app/api/notifications/notifications'
import { nanoid } from 'nanoid'

export const updateTodoTitle = tool({
  description: 'Update the todo title to any text',
  parameters: z.object({
    todoId: z.string().describe('The ID of the todo to update'),
    title: z.string().describe('The new title for the todo'),
  }),
  execute: async ({ todoId, title }) => {
    try {
      const [updatedTodo] = await db
        .update(todos)
        .set({ 
          title: title.trim(),
          updatedAt: new Date(),
        })
        .where(eq(todos.id, todoId))
        .returning()

      // Create activity message
      await db.insert(activities).values({
        id: nanoid(8),
        content: `AI updated title to "${title.trim()}"`,
        todoId,
        userId: 'ai-assistant',
      })

      await notifyWatchers({
        taskId: todoId,
        message: `AI updated todo title to "${title}"`,
        type: 'info'
      })

      revalidatePath(`/app/todos/${todoId}`)
      
      // Add cache tag revalidation - get userId from the updated todo
      if (updatedTodo.userId) {
        revalidateTag(`${updatedTodo.userId}:todos`)
        revalidateTag(`${updatedTodo.userId}:archived-todos`)
      }
      
      return {
        success: true,
        message: `Updated todo title to "${title}"`,
        newTitle: updatedTodo.title,
      }
    } catch (error) {
      console.error('Failed to update todo title:', error)
      return {
        success: false,
        message: 'Failed to update todo title',
      }
    }
  },
})

export const updateTodoDescription = tool({
  description: 'Update the todo description to any text',
  parameters: z.object({
    todoId: z.string().describe('The ID of the todo to update'),
    description: z.string().describe('The new description for the todo'),
  }),
  execute: async ({ todoId, description }) => {
    try {
      const [updatedTodo] = await db
        .update(todos)
        .set({ 
          description: description.trim(),
          updatedAt: new Date(),
        })
        .where(eq(todos.id, todoId))
        .returning()

      // Create activity message
      await db.insert(activities).values({
        id: nanoid(8),
        content: 'AI updated description',
        todoId,
        userId: 'ai-assistant',
      })

      await notifyWatchers({
        taskId: todoId,
        message: `AI updated todo description`,
        type: 'info'
      })

      revalidatePath(`/app/todos/${todoId}`)
      
      // Add cache tag revalidation - get userId from the updated todo
      if (updatedTodo.userId) {
        revalidateTag(`${updatedTodo.userId}:todos`)
        revalidateTag(`${updatedTodo.userId}:archived-todos`)
      }
      
      return {
        success: true,
        message: 'Updated todo description',
        newDescription: updatedTodo.description,
      }
    } catch (error) {
      console.error('Failed to update todo description:', error)
      return {
        success: false,
        message: 'Failed to update todo description',
      }
    }
  },
})

export const updateTodoDueDate = tool({
  description: 'Update the todo due date to any date, past or future',
  parameters: z.object({
    todoId: z.string().describe('The ID of the todo to update'),
    dueDate: z.string().optional().describe('The new due date in ISO format, or empty to remove due date'),
  }),
  execute: async ({ todoId, dueDate }) => {
    try {
      const newDueDate = dueDate ? new Date(dueDate) : null
      
      const [updatedTodo] = await db
        .update(todos)
        .set({ 
          dueDate: newDueDate,
          updatedAt: new Date(),
        })
        .where(eq(todos.id, todoId))
        .returning()

      const activityMessage = newDueDate 
        ? `AI set due date to ${newDueDate.toLocaleDateString()}`
        : 'AI removed due date'

      // Create activity message
      await db.insert(activities).values({
        id: nanoid(8),
        content: activityMessage,
        todoId,
        userId: 'ai-assistant',
      })

      await notifyWatchers({
        taskId: todoId,
        message: activityMessage,
        type: 'info'
      })

      revalidatePath(`/app/todos/${todoId}`)
      
      // Add cache tag revalidation - get userId from the updated todo
      if (updatedTodo.userId) {
        revalidateTag(`${updatedTodo.userId}:todos`)
        revalidateTag(`${updatedTodo.userId}:archived-todos`)
      }
      
      return {
        success: true,
        message: newDueDate 
          ? `Set due date to ${newDueDate.toLocaleDateString()}`
          : 'Removed due date',
        newDueDate: updatedTodo.dueDate,
      }
    } catch (error) {
      console.error('Failed to update todo due date:', error)
      return {
        success: false,
        message: 'Failed to update due date',
      }
    }
  },
})

export const toggleTodoCompletion = tool({
  description: 'Toggle the todo as complete, incomplete, done, not done, true or false',
  parameters: z.object({
    todoId: z.string().describe('The ID of the todo to toggle'),
    completed: z.boolean().optional().describe('Specific completion status, or leave empty to toggle'),
  }),
  execute: async ({ todoId, completed }) => {
    try {
      // First get current status if not specified
      if (completed === undefined) {
        const currentTodo = await db.query.todos.findFirst({
          where: eq(todos.id, todoId)
        })
        completed = !currentTodo?.completed
      }
      
      const [updatedTodo] = await db
        .update(todos)
        .set({ 
          completed,
          updatedAt: new Date(),
        })
        .where(eq(todos.id, todoId))
        .returning()

      const activityMessage = completed 
        ? 'AI marked as completed'
        : 'AI marked as incomplete'

      // Create activity message
      await db.insert(activities).values({
        id: nanoid(8),
        content: activityMessage,
        todoId,
        userId: 'ai-assistant',
      })

      await notifyWatchers({
        taskId: todoId,
        message: completed 
          ? 'AI marked todo as completed'
          : 'AI marked todo as incomplete',
        type: completed ? 'success' : 'info'
      })

      revalidatePath(`/app/todos/${todoId}`)
      
      // Add cache tag revalidation - get userId from the updated todo
      if (updatedTodo.userId) {
        revalidateTag(`${updatedTodo.userId}:todos`)
        revalidateTag(`${updatedTodo.userId}:archived-todos`)
      }
      
      return {
        success: true,
        message: completed ? 'Marked todo as done' : 'Marked todo as not done',
        completed: updatedTodo.completed,
      }
    } catch (error) {
      console.error('Failed to toggle todo completion:', error)
      return {
        success: false,
        message: 'Failed to update completion status',
      }
    }
  },
}) 
