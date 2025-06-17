import { getComments, getTodo, getUserById } from '@/lib/actions'
import { Suspense } from 'react'
import { getRateLimitStatus } from '@/lib/rate-limit'
import { unstable_cacheTag as cacheTag } from 'next/cache'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { TodoStateProvider } from './todo-state-context'
import { TodoItemPageClient } from './page-client'
import { WatchButton } from './watch-button'
import { ActivityChat } from './activity-chat'

export async function TodoItemPageServer({
  todoId,
  userId,
}: {
  todoId: string
  userId: string
}) {
  'use cache'
  cacheTag(userId, 'todos', todoId)

  const [todo, rateLimitStatus, comments, user] = await Promise.all([
    getTodo({ userId, todoId }),
    getRateLimitStatus(userId),
    getComments({ todoId, userId, includeActivity: true }),
    getUserById(userId),
  ])

  console.log(
    'page-server comments:',
    comments.map((c) => ({
      id: c.id,
      content: c.content,
      isActivity: c.isActivity,
      type: c.isActivity ? 'activity' : 'comment',
    })),
  )

  if (!user) {
    throw new Error('User not found')
  }

  return (
    <div>
      {/* Back button */}
      <div>
        <Button variant="outline" asChild size="sm">
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
              <ActivityChat
                todoId={todo.id}
                initialComments={comments}
                user={{
                  id: userId,
                  displayName: user.name,
                  primaryEmail: user.email,
                  profileImageUrl: user.image,
                }}
                todo={{
                  title: todo.title,
                  description: todo.description,
                }}
                rateLimitStatus={rateLimitStatus}
              />
            </Suspense>
          </div>
        </div>
      </TodoStateProvider>
    </div>
  )
}
