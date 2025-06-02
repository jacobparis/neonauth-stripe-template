import { getTodo, getUsersWithProfiles } from '@/lib/actions'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { stackServerApp } from '@/stack'
import { getRateLimitStatus } from '@/lib/rate-limit'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { TodoStateProvider } from './todo-state-context'
import { TodoItemPageClient } from './page-client'
import { WatchButton } from './watch-button'
import { EnhancedActivitySection } from './enhanced-activity-section'

export default async function TodoItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const todoId = parseInt(id, 10)

  if (isNaN(todoId)) {
    notFound()
  }

  try {
    const user = await stackServerApp.getUser({ or: 'redirect' })

    const [todo, users, rateLimitStatus] = await Promise.all([
      getTodo(todoId),
      getUsersWithProfiles(),
      getRateLimitStatus(user.id),
    ])

    if (!todo) {
      notFound()
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
          <TodoItemPageClient todo={todo} users={users} />

          {/* Activity Section */}
          <div className="px-6 mt-16">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 tracking-wide uppercase">
                Activity
              </h3>

              <WatchButton todoId={todo.id} />
            </div>

            <div className="mt-6">
              <Suspense
                fallback={
                  <div className="text-sm text-gray-500">
                    Loading activity...
                  </div>
                }
              >
                <EnhancedActivitySection
                  todo={todo}
                  rateLimitStatus={rateLimitStatus}
                />
              </Suspense>
            </div>
          </div>
        </TodoStateProvider>
      </div>
    )
  } catch (error) {
    console.error('Error loading todo page:', error)
    notFound()
  }
}
