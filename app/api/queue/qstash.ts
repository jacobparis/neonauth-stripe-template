import { Client } from "@upstash/qstash"
import { processDeleteTodos } from "@/actions/delete-todos"
import { processUpdateDueDate } from "@/actions/update-due-date"
import { processToggleCompleted } from "@/actions/toggle-completed"

export type QueueTask = 
  | { type: "deleteTodo"; key: `delete-todo-${number}`; id: number }
  | { type: "deleteTodos"; key: `delete-todos-${string}`; ids: number[]; userId: string }
  | { type: "updateDueDate"; key: `update-due-date-${string}`; ids: number[]; dueDate: string | null; userId: string }
  | { type: "toggleCompleted"; key: `toggle-completed-${string}`; ids: number[]; completed: boolean; userId: string }

export async function processTask(task: QueueTask) {
  try {
    switch (task.type) {
      case "deleteTodos":
        await processDeleteTodos(task.ids, task.userId)
        break
      case "updateDueDate":
        await processUpdateDueDate(task.ids, { 
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          userId: task.userId,
        })
        break
      case "toggleCompleted":
        await processToggleCompleted(task.ids, { 
          completed: task.completed,
          userId: task.userId,
        })
        break
      default: {
        throw new Error(`Unknown task type: ${task.type}`)
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error processing task:", error)
    return { error: "Failed to process task" }
  }
}

const client = new Client({
  token: process.env.QSTASH_TOKEN!,
})

export async function publishTask<T extends QueueTask>(task: T) {
  const url = new URL(`${process.env.VERCEL_URL}/api/queue`)

  const job = await client.publishJSON({
    url: url.toString(),
    body: task,
    deduplicationId: task.key,
    headers: {
      // Allows the queue to work in preview environments
      // https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!,
    }
  })

  return job
}
