"use server"

import { db } from "@/lib/db"
import { todos } from "@/drizzle/schema"
import { eq, inArray } from "drizzle-orm"
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

export async function bulkToggleCompleted(ids: number[], completed: boolean) {
  await db.update(todos)
    .set({ completed })
    .where(inArray(todos.id, ids))

  revalidatePath("/app/todos")
}
