'use client'

import { nanoid } from 'nanoid'

// Re-use the existing comment shape coming from the server
// (This is kept minimal to avoid introducing new interfaces or types.)
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { Comment } from '@/drizzle/schema'
import { Chat } from '@/components/chat'

type CommentWithUser = Comment & {
  user: {
    id: string
    email: string | null
    name: string | null
    image: string | null
  } | null
}

export function ActivityChat({
  todoId,
  initialComments,
  user,
  todo,
  rateLimitStatus,
}: {
  todoId: string
  initialComments: CommentWithUser[]
  user: {
    id: string
    displayName: string | null
    primaryEmail: string | null
    profileImageUrl: string | null
  }
  todo?: any
  rateLimitStatus?: any
}) {
  // Convert todo comments to the UIMessage shape expected by <Chat />
  function convertToUIMessages(comments: CommentWithUser[]) {
    return comments.map((comment) => ({
      id: comment.id ?? nanoid(),
      role: comment.userId === 'ai-assistant' ? 'assistant' : 'user',
      parts: [{ text: comment.content }],
      // The following properties are required by the Chat component but are
      // otherwise unused in this context. They are filled with safe defaults.
      content: '',
      createdAt: comment.createdAt ?? new Date(),
      experimental_attachments: [],
    }))
  }

  return (
    <>
      <Chat
        id={todoId}
        initialMessages={convertToUIMessages(initialComments) as any}
        isReadonly={false}
        // The Chat component requires a `session` prop, but we don't have a
        // Next-Auth session in this context. Passing `undefined` keeps the type
        // checker happy without creating new interfaces.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        session={undefined}
        autoResume={true}
      />
    </>
  )
}
