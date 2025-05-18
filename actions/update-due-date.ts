"use server"

import { db } from "@/lib/db"
import { todos } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function updateDueDate(formData: FormData) {
  const id = Number(formData.get("id"))
  const dueDateStr = formData.get("dueDate") as string | null

  if (isNaN(id)) {
    return { error: "Invalid todo ID" }
  }

  try {
    const dueDate = dueDateStr ? new Date(dueDateStr) : null

    await db.update(todos)
      .set({ dueDate })
      .where(eq(todos.id, id))
    
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to update due date:", error)
    return { error: "Failed to update due date" }
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
