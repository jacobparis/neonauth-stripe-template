"use server"

import { db } from "@/lib/db"
import { todos, comments } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { createNotification } from '@/app/api/notifications/notifications'
import { generateText } from 'ai'
import { getAI } from '@/lib/ai'

export async function generateTodoDescription(todoId: number, title: string, userId: string) {
  try {
    // Get the AI provider
    const ai = getAI()
    
    // Generate description using AI
    const { text } = await generateText({
      model: ai,
      prompt: `Given this todo title: "${title}"

Generate a helpful, detailed description for this todo item. The description should:
- Be 1-3 sentences long
- Provide context and clarify what needs to be done
- Include any relevant details or considerations
- Be actionable and specific

Description:`,
    })

    // Update the todo with the generated description
    await db
      .update(todos)
      .set({ 
        description: text.trim(),
        updatedAt: new Date()
      })
      .where(eq(todos.id, todoId))

    // Add an activity comment
    await db.insert(comments).values({
      content: "AI-generated description added",
      todoId,
      userId,
    })

    // Create notification
    await createNotification({
      userId,
      type: "info",
      message: "AI description generated for your todo",
      taskId: todoId,
    })

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
