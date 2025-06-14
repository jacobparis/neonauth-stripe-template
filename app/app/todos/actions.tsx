'use server'

import 'server-only'

import { and, eq, gte } from 'drizzle-orm'

// Use existing db setup
import { db } from '../../../lib/db'
import { comments } from '../../../drizzle/schema'

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(comments).where(eq(comments.id, id))
  } catch (error) {
    throw new Error('Failed to get message by id')
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string
  timestamp: Date
}) {
  try {
    // Delete comments (messages) from the todo (chat) after the timestamp
    return await db
      .delete(comments)
      .where(
        and(eq(comments.todoId, chatId), gte(comments.createdAt, timestamp)),
      )
  } catch (error) {
    throw new Error('Failed to delete messages by chat id after timestamp')
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id })

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.todoId,
    timestamp: message.createdAt,
  })
}
