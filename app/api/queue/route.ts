import { processTask} from "@/app/api/queue/qstash"
import { Receiver } from "@upstash/qstash"

export async function POST(req: Request) {
  const signature = req.headers.get("upstash-signature")
  const body = await req.text()
  
  if (!signature) {
    return Response.json({ error: "No signature" }, { status: 401 })
  }

  if (!body) {
    return Response.json({ error: "No body" }, { status: 401 })
  }

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  })

  const isValid = await receiver.verify({
    signature: signature || "",
    body,
  })

  if (!isValid) {
    return Response.json({ error: "Invalid signature" }, { status: 401 })
  }

  const task = JSON.parse(body) as QueueTask

  await processTask(task)

  return Response.json({ message: "Task processed" }, { status: 200 })
} 
