import { getComments } from '@/lib/actions'
import { CommentsSectionClient } from './comments-section-client'
import { stackServerApp } from '@/stack'

export async function CommentsSection({ todoId }: { todoId: string }) {
  const [comments, user] = await Promise.all([
    getComments({
      todoId,
      userId: '',
      includeActivity: true,
    }),
    stackServerApp.getUser(),
  ])

  if (!user) {
    throw new Error('User not found')
  }

  return (
    <CommentsSectionClient
      todoId={todoId}
      initialComments={comments}
      user={{
        id: user.id,
        displayName: user.displayName,
        primaryEmail: user.primaryEmail,
        profileImageUrl: user.profileImageUrl,
      }}
    />
  )
}
