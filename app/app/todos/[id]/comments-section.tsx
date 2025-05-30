import { stackServerApp } from '@/stack'
import { getComments } from '@/lib/actions'
import { CommentsSectionClient } from './comments-section-client'

export async function CommentsSection({ todoId }: { todoId: number }) {
  const user = await stackServerApp.getUser({ or: 'redirect' })
  const comments = await getComments(todoId)

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
