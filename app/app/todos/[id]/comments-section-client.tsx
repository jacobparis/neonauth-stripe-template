'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { useOptimistic, useTransition } from 'react'
import { addComment } from '@/lib/actions'
import { CommentForm } from './comment-form'
import type { Comment } from '@/drizzle/schema'

type CommentWithUser = Comment & {
  user: {
    id: string
    email: string | null
    name: string | null
    image: string | null
  } | null
}

export function CommentsSectionClient({
  todoId,
  initialComments,
  user,
}: {
  todoId: number
  initialComments: CommentWithUser[]
  user: {
    id: string
    displayName: string | null
    primaryEmail: string | null
    profileImageUrl: string | null
  }
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    initialComments,
    (state, newComment: CommentWithUser) => [...state, newComment],
  )

  const handleAddComment = async (formData: FormData) => {
    const content = formData.get('content') as string
    if (!content?.trim()) return

    // Submit to server with optimistic update inside transition
    startTransition(async () => {
      // Create optimistic comment
      const optimisticComment: CommentWithUser = {
        id: Date.now(), // Temporary ID
        content: content.trim(),
        todoId,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: user.id,
          email: user.primaryEmail || null,
          name: user.displayName || null,
          image: null, // We'll use Stack Auth image directly
        },
      }

      // Add optimistic comment immediately
      addOptimisticComment(optimisticComment)

      await addComment(formData)
    })
  }

  const shouldShowHeader = (comment: CommentWithUser, index: number) => {
    if (index === 0) return true

    const prevComment = optimisticComments[index - 1]
    if (prevComment.userId !== comment.userId) return true

    const prevTime = new Date(prevComment.createdAt)
    const currentTime = new Date(comment.createdAt)
    const timeDiff = currentTime.getTime() - prevTime.getTime()
    const oneHour = 60 * 60 * 1000

    return timeDiff > oneHour
  }

  return (
    <>
      {/* Comments */}
      {optimisticComments.map((comment, index) => {
        const showHeader = shouldShowHeader(comment, index)

        return (
          <div
            key={comment.id}
            className={`flex gap-3 group ${
              showHeader && index > 0 ? 'mt-4' : showHeader ? '' : 'mt-1'
            }`}
          >
            {showHeader ? (
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
            ) : (
              <div className="w-8" />
            )}
            <div className="flex-1 min-w-0">
              {showHeader && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user?.name || comment.user?.email}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(comment.createdAt), 'PPp')}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          </div>
        )
      })}

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
        <CommentForm
          todoId={todoId}
          onSubmit={handleAddComment}
          isPending={isPending}
        />
      </div>
    </>
  )
}
