import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import { Client } from "@upstash/qstash"
import { processTask, QueueTask } from "@/app/api/queue/vercel-queue"

export const POST = verifySignatureAppRouter(async (request: Request) => {
  const task = (await request.json()) as QueueTask
  console.log(`Processing: ${task.type}`)
  await processTask(task)
  return Response.json({ message: "Queue processing completed" })
})

export async function publishTask<T extends QueueTask>(task: T, options?: {
  delaySeconds?: number
}) {
  const client = new Client({ token: process.env.QSTASH_TOKEN! })

  const url =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/queue`
      : `http://localhost:3000/api/queue`

  await client.publishJSON({
    url,
    body: task,
    delay: options?.delaySeconds
  })

  return { success: true }
}
