import { CallbackConfig, VQSClient, createTopic } from "vercel-queue"
import { processTask, QueueTask } from "@/app/api/queue/vercel-queue"

const client = new VQSClient({
  token: process.env.VERCEL_OIDC_TOKEN!,
})

const topic = createTopic<QueueTask>(client, "task-queue")
const consumer = topic.consumerGroup("task-processors")

export async function POST() {
  const signal = AbortSignal.timeout(25000)

  try {
    await consumer.subscribe(signal, async (message) => {
      console.log(`Processing: ${message.payload.type}`)
      await processTask(message.payload)
    })

    return Response.json({ message: "Queue processing completed" }, { status: 200 })
  } catch (error) {
    return Response.json({ error: "Queue processing failed" }, { status: 500 })
  }
}


export async function publishTask<T extends QueueTask>(task: T, options?: {
  idempotencyKey?: string;
  retentionSeconds?: number;
  callbacks?: Record<string, CallbackConfig>;
}) {
  await topic.publish(task, options)

  // wake up the processor
  void fetch(`${process.env.VERCEL_URL}/api/queue`, {
    method: 'POST'
  }).catch(() => {})
  
  return { success: true }
}
