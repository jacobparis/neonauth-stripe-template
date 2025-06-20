import { getComments, getTodo, getUserById } from '@/lib/actions'
import { Suspense } from 'react'
import { getRateLimitStatus } from '@/lib/rate-limit'
import {
  unstable_cacheTag as cacheTag,
  unstable_cache as cache,
} from 'next/cache'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { TodoStateProvider } from './todo-state-context'
import { TodoItemPageClient } from './page-client'
import { WatchButton } from './watch-button'
import { Chat } from '@/components/chat'

export async function TodoItemPageServer({
  todoId,
  userId,
}: {
  todoId: string
  userId: string
}) {
  const [todo, rateLimitStatus, comments, user] = await cache(
    async (userId: string, todoId: string) => {
      return Promise.all([
        getTodo({ userId, todoId }),
        getRateLimitStatus(userId),
        getComments({ todoId, userId, includeActivity: true }),
        getUserById(userId),
      ])
    },
    [userId, todoId],
    {
      tags: [`${userId}:todos:${todoId}`],
      revalidate: 60,
    },
  )(userId, todoId)

  if (!user) {
    throw new Error('User not found')
  }

  return (
    <div>
      {/* Back button */}
      <div className="mt-4">
        <Button variant="outline" asChild size="sm" className="mt-4">
          <Link href="/app/todos">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to todos</span>
          </Link>
        </Button>
      </div>

      <TodoStateProvider todo={todo}>
        <div className="mt-8">
          <TodoItemPageClient todo={todo} />
        </div>

        {/* Activity Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Activity
            </h3>

            <WatchButton todoId={todo.id} />
          </div>

          <div className="mt-6">
            <Suspense
              fallback={
                <div className="text-sm text-muted-foreground">
                  Loading activity...
                </div>
              }
            >
              <Chat
                id={todoId}
                initialMessages={comments.map((comment) => ({
                  id: comment.id,
                  role:
                    comment.userId === 'ai-assistant' ? 'assistant' : 'user',
                  parts: [{ type: 'text' as const, text: comment.content }],
                  content: '',
                  metadata: {
                    isActivity: comment.isActivity,
                  },
                }))}
                isReadonly={false}
                autoResume={true}
              />
            </Suspense>
          </div>
        </div>
      </TodoStateProvider>
    </div>
  )
}
