import { TodoItemPageClient } from './page-client'
import { getTodo, getUserTodoMetrics } from '@/lib/actions'
import { stackServerApp } from '@/stack'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'

// Import the loading component
import TodoItemLoading from './loading'
import { WatchButton } from './watch-button'

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

  const user = await stackServerApp.getUser({ or: 'redirect' })

  try {
    const [todo, userMetrics] = await Promise.all([
      getTodo(todoId),
      user ? getUserTodoMetrics(user.id) : Promise.resolve(null),
    ])

    // Get the total created todos and todo limit from the user metrics
    const todoLimit =
      userMetrics && !('error' in userMetrics) ? userMetrics.todoLimit : 10

    return (
      <div>
        {/* Back button */}
        <div>
          <Button variant="ghost" asChild size="sm">
            <Link href="/app/todos">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to todos</span>
            </Link>
          </Button>
        </div>
        <Suspense fallback={<TodoItemLoading />}>
          <TodoItemPageClient
            todo={todo}
            todoLimit={todoLimit}
            userId={user.id}
            email={user.primaryEmail || ''}
            name={user.displayName}
          />
        </Suspense>

        {/* Activity Section */}
        <div className="px-6 mt-16">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wide uppercase">
              Activity
            </h3>
            <WatchButton todoId={todo.id} userId={user.id} />
          </div>
          <div className="space-y-4 mt-6">
            <div className="flex gap-3 group">
              <div className="flex flex-col items-center">
                <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                    {user.displayName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {user.displayName || user.primaryEmail}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(todo.createdAt), 'PPP')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Created this task</p>
              </div>
            </div>
            {todo.updatedAt && (
              <div className="flex gap-3 group">
                <div className="flex flex-col items-center">
                  <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                      {user.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {user.displayName || user.primaryEmail}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(todo.updatedAt), 'PPP')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Updated this task</p>
                </div>
              </div>
            )}
          </div>

          {/* Add Comment */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200/40">
            <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                {user.displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200/40 hover:bg-gray-50/80 transition-all duration-200 cursor-text">
                <p className="text-sm text-gray-500 font-medium">
                  Add a comment...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}
