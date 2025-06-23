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

  if (!process.env.VERCEL_URL) {
    throw new Error('VERCEL_URL must be set. If you are running locally, use npx untun@latest tunnel http://localhost:3000')
  }

  const baseUrl = process.env.VERCEL_URL.startsWith('http') ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`

  const url = `${baseUrl}/api/queue`
      
  await client.publishJSON({
    url,
    body: task,
    delay: options?.delaySeconds
  })

  return { success: true }
}
