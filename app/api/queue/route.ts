import { CallbackConfig, VQSClient, createTopic, parseCallbackRequest } from "vercel-queue"
import { processTask, QueueTask } from "@/app/api/queue/vercel-queue"
import { NextRequest } from "next/server"

async function getVercelQueueClient() {
  return process.env.VERCEL_OIDC_TOKEN ? new VQSClient({
    token: process.env.VERCEL_OIDC_TOKEN!,
  }) : await VQSClient.fromVercelFunction()
}

export async function POST(request: NextRequest) {
  const { queueName: topic, messageId, consumerGroup } = await parseCallbackRequest(request)

  const client = await getVercelQueueClient()

  const topicClient = createTopic<QueueTask>(client, topic)
  const cg = topicClient.consumerGroup(consumerGroup)
  
  if (consumerGroup === 'task') {
    await cg.receiveMessage(messageId, async (message) => {
      console.log(`Processing: ${message.payload.type}`)
      await processTask(message.payload)
    })

    return Response.json({ message: "Queue processing completed" }, { status: 200 })
  } 

  return Response.json({ error: "Invalid consumer group" }, { status: 400 })
}


export async function publishTask<T extends QueueTask>(task: T, options?: {
  idempotencyKey?: string;
  retentionSeconds?: number;
  callbacks?: Record<string, CallbackConfig>;
}) {
  const client = await getVercelQueueClient()

  const topic = createTopic<QueueTask>(client, "task-queue")

  await topic.publish(task, {
    ...options,
    callbacks: {
      'task': {
        url: `${process.env.VERCEL_URL}/api/queue`,
        delay: 0,
        frequency: 10
      }
    }
  })
  
  return { success: true }
}
