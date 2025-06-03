import { getComments } from '@/lib/actions'
import { CommentsSectionClient } from './comments-section-client'

export async function CommentsSection({ todoId }: { todoId: string }) {
  const comments = await getComments(todoId)

  return <CommentsSectionClient todoId={todoId} initialComments={comments} />
}
