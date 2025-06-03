"use server"

import { db } from "@/lib/db"
import { todos, comments } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { createNotification } from '@/app/api/notifications/notifications'
import { generateObject } from 'ai'
import { getAI } from '@/lib/ai'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const todoResponseSchema = z.object({
  description: z.string().describe('A detailed description (1-3 sentences) that provides context and clarifies what needs to be done'),
  questions: z.array(z.string()).describe('Relevant questions that might help clarify requirements or next steps')
})

export async function generateTodoDescription(todoId: string, title: string, userId: string) {
  try {
    // Get the AI provider
    const ai = getAI()
    
    // Generate description and questions using AI
    const { object } = await generateObject({
      model: ai,
      schema: todoResponseSchema,
      prompt: `Given this todo title: "${title}"

Generate a helpful response with:
1. A detailed description that provides context and clarifies what needs to be done
2. Relevant questions that might help clarify requirements or next steps (0-3 questions)`,
    })

    const { description, questions } = object

    // Update the todo with the generated description
    await db
      .update(todos)
      .set({ 
        description: description,
        updatedAt: new Date()
      })
      .where(eq(todos.id, todoId))

    // Add questions as individual comments
    for (const question of questions) {
      await db.insert(comments).values({
        id: nanoid(8),
        content: question,
        todoId,
        userId,
      })
    }

    revalidatePath(`/app/todos/${todoId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to generate description:", error)
    
    // Create error notification
    await createNotification({
      userId,
      type: "error",
      message: "Failed to generate AI description",
      taskId: todoId,
    })
    
    return { error: "Failed to generate description" }
  }
} 
