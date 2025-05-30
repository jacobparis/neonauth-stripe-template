import { TodoItemPageClient } from './page-client'
import { getTodo, getComments } from '@/lib/actions'
import { stackServerApp } from '@/stack'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'

// Import the loading component
import { WatchButton } from './watch-button'
import { CommentForm } from './comment-form'

export default async function TodoItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const todoId = parseInt(id, 10)
  const todo = await getTodo(todoId)
  const user = await stackServerApp.getUser({ or: 'redirect' })

  if (isNaN(todoId) || !todo) {
    notFound()
  }

  const comments = await getComments(todoId)

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

      <TodoItemPageClient todo={todo} />

      {/* Activity Section */}
      <div className="px-6 mt-16">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 tracking-wide uppercase">
            Activity
          </h3>
          <Suspense
            fallback={
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            }
          >
            <WatchButton todoId={todo.id} userId={user.id} />
          </Suspense>
        </div>
        <div className="space-y-4 mt-6">
          <div className="flex gap-3 group">
            <div className="flex flex-col items-center">
              <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                <AvatarImage
                  src={user.profileImageUrl || undefined}
                  alt={user.displayName || user.primaryEmail || ''}
                />
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
                  <AvatarImage
                    src={user.profileImageUrl || undefined}
                    alt={user.displayName || user.primaryEmail || ''}
                  />
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

          {/* Comments */}
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <div className="flex flex-col items-center">
                <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                  <AvatarImage
                    src={
                      comment.userId === user.id
                        ? user.profileImageUrl || undefined
                        : comment.user?.image || undefined
                    }
                    alt={comment.user?.name || comment.user?.email || ''}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                    {comment.user?.name?.[0]?.toUpperCase() ||
                      comment.user?.email?.[0]?.toUpperCase() ||
                      'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user?.name || comment.user?.email}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(comment.createdAt), 'PPP')}
                  </span>
                </div>
                <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200/40">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Comment Form */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200/40">
          <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
            <AvatarImage
              src={user.profileImageUrl || undefined}
              alt={user.displayName || user.primaryEmail || ''}
            />
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
              {user.displayName?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <CommentForm todoId={todo.id} />
        </div>
      </div>
    </div>
  )
}
