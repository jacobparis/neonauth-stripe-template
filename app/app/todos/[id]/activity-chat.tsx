'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { useOptimistic, useTransition, useState } from 'react'
import { addComment } from '@/lib/actions'
import { useChat } from '@ai-sdk/react'
import { Bot, Send, Sparkles } from 'lucide-react'
import type { Comment } from '@/drizzle/schema'
import { useTodoState } from './todo-state-context'

type CommentWithUser = Comment & {
  user: {
    id: string
    email: string | null
    name: string | null
    image: string | null
  } | null
}

type ActivityMessage = {
  id: string | number
  type: 'comment' | 'ai' | 'user-message'
  content: string
  createdAt: Date
  user?: {
    id: string
    email: string | null
    name: string | null
    image: string | null
  } | null
  role?: 'user' | 'assistant'
}

export function ActivityChat({
  todoId,
  initialComments,
  user,
  todo,
}: {
  todoId: number
  initialComments: CommentWithUser[]
  user: {
    id: string
    displayName: string | null
    primaryEmail: string | null
    profileImageUrl: string | null
  }
  todo: {
    title: string
    description: string | null
  }
}) {
  const [isPending, startTransition] = useTransition()
  const [inputValue, setInputValue] = useState('')

  // Get state handlers from context
  const stateHandlers = useTodoState()

  const [optimisticComments, addOptimisticComment] = useOptimistic(
    initialComments,
    (state, newComment: CommentWithUser) => [...state, newComment],
  )

  const {
    messages,
    input,
    handleInputChange,
    append,
    isLoading: isAiLoading,
    error: chatError,
  } = useChat({
    api: '/api/chat',
    body: {
      todoId,
      todoContext: {
        title: todo.title,
        description: todo.description,
      },
    },
    onError: (error) => {
      console.error('Chat error:', error)
    },
    onToolCall: ({ toolCall }) => {
      // Handle tool calls to trigger immediate state updates
      switch (toolCall.toolName) {
        case 'updateTodoTitle':
          const titleArgs = toolCall.args as { todoId: number; title: string }
          stateHandlers.setTitle(titleArgs.title)
          break
        case 'updateTodoDescription':
          const descArgs = toolCall.args as {
            todoId: number
            description: string
          }
          stateHandlers.setDescription(descArgs.description)
          break
        case 'updateTodoDueDate':
          const dateArgs = toolCall.args as { todoId: number; dueDate?: string }
          const dueDate = dateArgs.dueDate
            ? new Date(dateArgs.dueDate)
            : undefined
          stateHandlers.setDate(dueDate)
          break
        case 'toggleTodoCompletion':
          const completionArgs = toolCall.args as {
            todoId: number
            completed?: boolean
          }
          if (completionArgs.completed !== undefined) {
            stateHandlers.setCompleted(completionArgs.completed)
          } else {
            // If no specific status provided, toggle current state
            stateHandlers.setCompleted(!stateHandlers.completed)
          }
          break
        case 'assignTodo':
          const assignArgs = toolCall.args as { todoId: number; userId: string }
          const userId =
            assignArgs.userId === 'unassign' ? null : assignArgs.userId
          stateHandlers.setAssignedUserId(userId)
          break
      }
    },
  })

  // Combine comments and AI messages into a unified activity feed
  const activityMessages: ActivityMessage[] = [
    ...optimisticComments.map((comment) => ({
      id: comment.id,
      type: 'comment' as const,
      content: comment.content,
      createdAt: comment.createdAt,
      user: comment.user,
    })),
    ...messages.map((message: any) => ({
      id: message.id,
      type:
        message.role === 'assistant'
          ? ('ai' as const)
          : ('user-message' as const),
      content: message.content,
      createdAt: new Date(message.createdAt || Date.now()),
      role: message.role,
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const handleSubmit = async () => {
    if (!inputValue.trim()) return

    // Check if user is trying to talk to AI (starts with @ai or mentions AI)
    const isAiMessage =
      inputValue.toLowerCase().startsWith('@ai') ||
      inputValue.toLowerCase().includes('@ai') ||
      inputValue.toLowerCase().includes('ai assistant') ||
      inputValue.toLowerCase().includes('help me') ||
      inputValue.toLowerCase().includes('suggest') ||
      inputValue.toLowerCase().includes('how can') ||
      inputValue.toLowerCase().includes('what should')

    if (isAiMessage) {
      // Send to AI
      const cleanedMessage = inputValue.replace(/@ai\s*/gi, '').trim()
      await append({
        role: 'user',
        content: `Context: Working on task "${todo.title}"${
          todo.description ? ` - ${todo.description}` : ''
        }\n\nMessage: ${cleanedMessage}`,
      })
      setInputValue('')
    } else {
      // Add as regular comment
      const formData = new FormData()
      formData.append('content', inputValue.trim())
      formData.append('todoId', todoId.toString())

      startTransition(async () => {
        const optimisticComment: CommentWithUser = {
          id: Date.now(),
          content: inputValue.trim(),
          todoId,
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: user.id,
            email: user.primaryEmail || null,
            name: user.displayName || null,
            image: null,
          },
        }

        addOptimisticComment(optimisticComment)
        setInputValue('')
        await addComment(formData)
      })
    }
  }

  const shouldShowHeader = (message: ActivityMessage, index: number) => {
    if (index === 0) return true

    const prevMessage = activityMessages[index - 1]
    if (message.type !== prevMessage.type) return true

    if (message.type === 'comment' && prevMessage.type === 'comment') {
      return message.user?.id !== prevMessage.user?.id
    }

    const prevTime = new Date(prevMessage.createdAt)
    const currentTime = new Date(message.createdAt)
    const timeDiff = currentTime.getTime() - prevTime.getTime()
    const oneHour = 60 * 60 * 1000

    return timeDiff > oneHour
  }

  return (
    <div className="space-y-4">
      {/* Unified Activity Feed */}
      <div className="space-y-2">
        {activityMessages.map((message, index) => {
          const showHeader = shouldShowHeader(message, index)

          return (
            <div
              key={message.id}
              className={`flex gap-3 group ${
                showHeader && index > 0 ? 'mt-4' : showHeader ? '' : 'mt-1'
              }`}
            >
              {showHeader ? (
                <div className="flex flex-col items-center">
                  <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                    {message.type === 'ai' ? (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <>
                        <AvatarImage
                          src={
                            message.type === 'user-message'
                              ? user.profileImageUrl || undefined
                              : message.user?.image || undefined
                          }
                          alt={message.user?.name || message.user?.email || ''}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                          {message.user?.name?.[0]?.toUpperCase() ||
                            message.user?.email?.[0]?.toUpperCase() ||
                            'U'}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                </div>
              ) : (
                <div className="w-8" />
              )}
              <div className="flex-1 min-w-0">
                {showHeader && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {message.type === 'ai' ? (
                        <span className="flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          AI Assistant
                        </span>
                      ) : (
                        message.user?.name || message.user?.email
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(message.createdAt), 'PPp')}
                    </span>
                  </div>
                )}
                <div
                  className={`text-sm whitespace-pre-wrap ${
                    message.type === 'ai'
                      ? 'bg-blue-50 p-3 rounded-lg text-gray-800 border border-blue-100'
                      : 'text-gray-700'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Unified Input */}
      <div className="flex gap-3 pt-4 border-t border-gray-200/40">
        <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
          <AvatarImage
            src={user.profileImageUrl || undefined}
            alt={user.displayName || user.primaryEmail || ''}
          />
          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
            {user.displayName?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {chatError && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                AI assistant is currently unavailable. Comments will still work
                normally.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Add a comment or ask the AI assistant for help... (use @ai to talk to AI)"
                className="min-h-[80px] resize-none pr-10"
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
              />
              {inputValue.toLowerCase().includes('@ai') ||
              inputValue.toLowerCase().includes('help') ||
              inputValue.toLowerCase().includes('suggest') ? (
                <div className="absolute top-2 right-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                </div>
              ) : null}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isPending || isAiLoading}
              size="sm"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            💡 Tip: Start with{' '}
            <code className="bg-gray-100 px-1 rounded">@ai</code> or use words
            like "help", "suggest" to talk to the AI assistant
          </div>
        </div>
      </div>
    </div>
  )
}
