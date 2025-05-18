"use server"

import { db } from "@/lib/db"
import { todos } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function updateTodoProject(formData: FormData) {
  const id = Number(formData.get("id"))
  const projectIdStr = formData.get("projectId") as string | null

  if (isNaN(id)) {
    return { error: "Invalid todo ID" }
  }

  try {
    const projectId = projectIdStr ? Number(projectIdStr) : null

    await db.update(todos)
      .set({ projectId })
      .where(eq(todos.id, id))
    
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to update todo project:", error)
    return { error: "Failed to update todo project" }
  }
}

export async function bulkUpdateProject(todoIds: number[], projectId: number | null) {
  if (!todoIds.length) {
    return { success: true }
  }

  try {
    // For simplicity, we'll update one by one
    // In a real implementation, you might use a WHERE IN clause
    for (const id of todoIds) {
      await db.update(todos)
        .set({ projectId })
        .where(eq(todos.id, id))
    }
    
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to update todo projects:", error)
    return { error: "Failed to update todo projects" }
  }
} 
