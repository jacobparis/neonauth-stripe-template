"use server"

import { db } from "@/lib/db"
import { todos } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function toggleTodoCompleted(formData: FormData) {
  const id = Number(formData.get("id"))
  const completed = formData.get("completed") === "true"

  if (isNaN(id)) {
    return { error: "Invalid todo ID" }
  }

  try {
    await db.update(todos)
      .set({ completed })
      .where(eq(todos.id, id))
    
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to toggle todo completion:", error)
    return { error: "Failed to toggle todo completion" }
  }
}

export async function bulkToggleCompleted(todoIds: number[], completed: boolean) {
  if (!todoIds.length) {
    return { success: true }
  }

  try {
    // For simplicity, we'll update one by one
    // In a real implementation, you might use a WHERE IN clause
    for (const id of todoIds) {
      await db.update(todos)
        .set({ completed })
        .where(eq(todos.id, id))
    }
    
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to toggle todos completion:", error)
    return { error: "Failed to toggle todos completion" }
  }
} 
