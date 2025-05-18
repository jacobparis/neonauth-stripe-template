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

  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const sampleTodos = [
    {
      text: "Review project proposal",
      dueDate: tomorrow,
      completed: false,
      ownerId: user.id,
      userId: user.id,
    },
    {
      text: "Send weekly update to team",
      dueDate: now,
      completed: false,
      ownerId: user.id,
      userId: user.id,
    },
    {
      text: "Prepare presentation slides",
      dueDate: nextWeek,
      completed: false,
      ownerId: user.id,
      userId: user.id,
    },
    {
      text: "Schedule team meeting",
      dueDate: tomorrow,
      completed: false,
      ownerId: user.id,
      userId: user.id,
    },
    {
      text: "Update documentation",
      dueDate: nextWeek,
      completed: false,
      ownerId: user.id,
      userId: user.id,
    },
  ]

  await db.insert(todos).values(sampleTodos)
  
  revalidatePath("/app/todos")
  return { success: true }
} 
