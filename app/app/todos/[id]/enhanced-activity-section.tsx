import { stackServerApp } from '@/stack'
import { getComments } from '@/lib/actions'
import { ActivityChat } from './activity-chat'
import type { TodoStateHandlers } from './todo-state-context'

export async function EnhancedActivitySection({
  todo,
  stateHandlers,
  rateLimitStatus,
}: {
  todo: {
    id: string
    title: string
    description: string | null
    createdAt: Date
    updatedAt: Date
  }
  stateHandlers?: TodoStateHandlers
  rateLimitStatus: {
    remaining: number
    reset: number
  }
}) {
  try {
    const user = await stackServerApp.getUser({ or: 'redirect' })
    const comments = await getComments(todo.id)

    return (
      <ActivityChat
        todoId={todo.id}
        initialComments={comments}
        user={{
          id: user.id,
          displayName: user.displayName,
          primaryEmail: user.primaryEmail,
          profileImageUrl: user.profileImageUrl,
        }}
        todo={{
          title: todo.title,
          description: todo.description,
        }}
        stateHandlers={stateHandlers}
        rateLimitStatus={rateLimitStatus}
      />
    )
  } catch (error) {
    console.error('Error loading activity section:', error)
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          Unable to load activity section. Please try refreshing the page.
        </p>
      </div>
    )
  }
}
