import { Client } from "@upstash/qstash"
import { processUpdateStatus } from "@/actions/update-issue-status"
import { processUpdatePriority } from "@/actions/update-issue-priority"
import { processDeleteIssues } from "@/actions/delete-issues"
import type { Issue } from "@/lib/db/schema"

export type QueueTask = 
  | { type: "createIssue"; key: `create-issue-${string}`; issue: Issue }
  | { type: "updateStatus"; key: `update-status-${string}`; ids: number[]; status: string; userId: string }
  | { type: "updatePriority"; key: `update-priority-${string}`; ids: number[]; priority: string; userId: string }
  | { type: "deleteIssues"; key: `delete-issues-${string}`; ids: number[]; userId: string }

export async function processTask(task: QueueTask) {
  try {
    switch (task.type) {
      case "updateStatus":
        await processUpdateStatus(task.ids, { status: task.status, userId: task.userId })
        break
      case "updatePriority":
        await processUpdatePriority(task.ids, { priority: task.priority, userId: task.userId })
        break
      case "deleteIssues":
        await processDeleteIssues(task.ids, task.userId)
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
