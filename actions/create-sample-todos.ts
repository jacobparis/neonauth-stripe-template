"use server"

import { db } from "@/lib/db"
import { todos } from "@/lib/schema"
import { revalidatePath } from "next/cache"
import { stackServerApp } from "@/stack"

export async function createSampleTodos() {
  const user = await stackServerApp.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const sampleTodos = [
    ['2025-05-19', 'Review project proposal'],
    ['2025-05-20', 'Send weekly update to team'],
    ['2025-05-21', 'Prepare presentation slides'],
    ['2025-05-22', 'Schedule team meeting'],
    ['2025-05-23', 'Update documentation'],
  ]

  await db.insert(todos).values(sampleTodos.map(([date, title]) => ({
    title,
    due_date: new Date(date),
    completed: false,
    assigned_to_id: user.id
  })))
  
  revalidatePath("/app/todos")
  return { success: true }
}
