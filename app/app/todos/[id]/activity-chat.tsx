'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import {
  useOptimistic,
  useTransition,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { addComment } from '@/lib/actions'
import { useChat } from '@ai-sdk/react'
import { Bot, Send, Sparkles, Copy, ChevronDown } from 'lucide-react'
import type { Comment } from '@/drizzle/schema'
import { useTodoState } from './todo-state-context'
import { MessageReasoning } from '@/components/message-reasoning'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get state handlers from context
  const stateHandlers = useTodoState()

  // Auto-scroll functionality
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Enhanced input functionality
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = '80px'
    }
  }, [])

  // Local storage persistence
  useEffect(() => {
    const savedInput = localStorage.getItem(`todo-chat-input-${todoId}`)
    if (savedInput && !inputValue) {
      setInputValue(savedInput)
      setTimeout(adjustHeight, 0)
    }
  }, [todoId, inputValue, adjustHeight])

  useEffect(() => {
    localStorage.setItem(`todo-chat-input-${todoId}`, inputValue)
  }, [inputValue, todoId])

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value)
      adjustHeight()
    },
    [adjustHeight],
  )

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const checkScrollPosition = useCallback(() => {
    if (!messagesContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 100

    setIsAtBottom(atBottom)
    setShowScrollButton(!atBottom && scrollHeight > clientHeight)
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener('scroll', checkScrollPosition)
    return () => container.removeEventListener('scroll', checkScrollPosition)
  }, [checkScrollPosition])

  // Copy functionality - improved to match ai-chatbot patterns
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Message Actions Component - improved to match ai-chatbot patterns
  const MessageActions = ({ content }: { content: string }) => {
    // Extract text content from message (similar to ai-chatbot's approach)
    const textContent = content
      .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
      .trim()

    if (!textContent) return null

    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-row gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="py-1 px-2 h-fit text-muted-foreground"
                variant="outline"
                onClick={async () => {
                  if (!textContent) {
                    toast.error("There's no text to copy!")
                    return
                  }
                  await copyToClipboard(textContent)
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    )
  }

  // Helper function to add AI activity comments
  const addAiActivityComment = async (content: string) => {
    try {
      const formData = new FormData()
      formData.append('content', content)
      formData.append('todoId', todoId.toString())
      formData.append('isAiGenerated', 'true')

      // Add optimistically to the comments list
      const optimisticComment: CommentWithUser = {
        id: Date.now() + Math.random(), // Ensure unique ID
        content,
        todoId,
        userId: 'ai-assistant',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'ai-assistant',
          email: 'ai@assistant.local',
          name: 'AI Assistant',
          image: null,
        },
      }

      startTransition(() => {
        addOptimisticComment(optimisticComment)
      })
      await addComment(formData)
    } catch (error) {
      console.error('Failed to save AI activity comment:', error)
    }
  }

  // Helper function to add AI reasoning activity comment
  const addAiReasoningComment = async (reasoning: string) => {
    try {
      const formData = new FormData()
      formData.append('content', `<thinking>${reasoning}</thinking>`)
      formData.append('todoId', todoId.toString())
      formData.append('isAiGenerated', 'true')

      // Add optimistically to the comments list
      const optimisticComment: CommentWithUser = {
        id: Date.now() + Math.random(), // Ensure unique ID
        content: `<thinking>${reasoning}</thinking>`,
        todoId,
        userId: 'ai-assistant',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'ai-assistant',
          email: 'ai@assistant.local',
          name: 'AI Assistant',
          image: null,
        },
      }

      startTransition(() => {
        addOptimisticComment(optimisticComment)
      })
      await addComment(formData)
    } catch (error) {
      console.error('Failed to save AI reasoning comment:', error)
    }
  }

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
      // Provide previous comments as context, not as instructions
      previousActivity: optimisticComments.map((comment) => ({
        user: comment.user?.name || comment.user?.email || 'User',
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        isAiGenerated: comment.userId === 'ai-assistant',
      })),
    },
    // Remove initialMessages to avoid treating previous comments as current instructions
    onError: (error) => {
      console.error('Chat error:', error)
    },
    onToolCall: ({ toolCall }) => {
      // Handle tool calls to trigger immediate state updates
      switch (toolCall.toolName) {
        case 'updateTodoTitle':
          const titleArgs = toolCall.args as { todoId: number; title: string }
          stateHandlers.setTitle(titleArgs.title)
          // Add activity comment for AI title change
          addAiActivityComment(`Title changed to "${titleArgs.title}"`)
          break
        case 'updateTodoDescription':
          const descArgs = toolCall.args as {
            todoId: number
            description: string
          }
          stateHandlers.setDescription(descArgs.description)
          // Add activity comment for AI description change
          if (descArgs.description) {
            addAiActivityComment(`Description updated`)
          } else {
            addAiActivityComment(`Description removed`)
          }
          break
        case 'updateTodoDueDate':
          const dateArgs = toolCall.args as { todoId: number; dueDate?: string }
          const dueDate = dateArgs.dueDate
            ? new Date(dateArgs.dueDate)
            : undefined
          stateHandlers.setDate(dueDate)
          // Add activity comment for AI due date change
          const dueDateComment = dueDate
            ? `Due date set to ${dueDate.toLocaleDateString()}`
            : `Due date removed`
          addAiActivityComment(dueDateComment)
          break
        case 'toggleTodoCompletion':
          const completionArgs = toolCall.args as {
            todoId: number
            completed?: boolean
          }
          let newCompletedState: boolean
          if (completionArgs.completed !== undefined) {
            newCompletedState = completionArgs.completed
            stateHandlers.setCompleted(completionArgs.completed)
          } else {
            // If no specific status provided, toggle current state
            newCompletedState = !stateHandlers.completed
            stateHandlers.setCompleted(newCompletedState)
          }
          // Add activity comment for AI completion change
          const completionComment = newCompletedState
            ? `Marked as completed`
            : `Marked as incomplete`
          addAiActivityComment(completionComment)
          break
        case 'assignTodo':
          const assignArgs = toolCall.args as { todoId: number; userId: string }
          const userId =
            assignArgs.userId === 'unassign' ? null : assignArgs.userId
          stateHandlers.setAssignedUserId(userId)
          // Add activity comment for AI assignment change
          if (userId) {
            addAiActivityComment(`Assigned to user`)
          } else {
            addAiActivityComment(`Unassigned`)
          }
          break
      }
    },
    onFinish: async (message) => {
      // Handle AI assistant message completion
      if (message.role === 'assistant' && message.content) {
        try {
          const { thinking, mainContent } = extractThinking(message.content)

          // Create separate activity entries for reasoning and response
          if (thinking) {
            await addAiReasoningComment(thinking)
          }

          // If there's main content beyond just tool calls, save it as a regular comment
          if (mainContent && mainContent.trim()) {
            const formData = new FormData()
            formData.append('content', mainContent)
            formData.append('todoId', todoId.toString())
            formData.append('isAiGenerated', 'true')

            // Add optimistically to the comments list
            const optimisticComment: CommentWithUser = {
              id: Date.now(),
              content: mainContent,
              todoId,
              userId: 'ai-assistant',
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: 'ai-assistant',
                email: 'ai@assistant.local',
                name: 'AI Assistant',
                image: null,
              },
            }

            startTransition(() => {
              addOptimisticComment(optimisticComment)
            })
            await addComment(formData)
          }
        } catch (error) {
          console.error('Failed to save AI message as comment:', error)
        }
      }
    },
  })

  // Helper function to determine if a comment is an activity log
  const isActivityLog = (content: string) => {
    const activityPatterns = [
      'Title changed to',
      'Description updated',
      'Description removed',
      'Due date set to',
      'Due date removed',
      'Assigned to',
      'Unassigned',
      'Marked as completed',
      'Marked as incomplete',
      '<thinking>', // XML reasoning entries
    ]
    return activityPatterns.some((pattern) => content.includes(pattern))
  }

  // Helper function to determine if a comment is AI reasoning
  const isReasoningLog = (content: string) => {
    return content.includes('<thinking>')
  }

  // Helper function to extract thinking content from AI messages
  const extractThinking = (content: string) => {
    const thinkingStart = content.indexOf('<thinking>')
    const thinkingEnd = content.indexOf('</thinking>')

    if (
      thinkingStart !== -1 &&
      thinkingEnd !== -1 &&
      thinkingEnd > thinkingStart
    ) {
      const thinking = content
        .substring(thinkingStart + '<thinking>'.length, thinkingEnd)
        .trim()
      const beforeThinking = content.substring(0, thinkingStart)
      const afterThinking = content.substring(
        thinkingEnd + '</thinking>'.length,
      )
      const mainContent = (beforeThinking + afterThinking).trim()

      return { thinking, mainContent }
    }
    return { thinking: null, mainContent: content }
  }

  // Display only persisted comments (including AI-generated ones)
  // AI messages are now saved as comments, so we don't need separate message display
  const activityMessages: ActivityMessage[] = [
    ...optimisticComments.map((comment) => ({
      id: comment.id,
      type:
        comment.userId === 'ai-assistant'
          ? ('ai' as const)
          : ('comment' as const),
      content: comment.content,
      createdAt: comment.createdAt,
      user: comment.user,
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  // Auto-scroll on new messages when at bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom()
    }
  }, [activityMessages.length, isAiLoading, scrollToBottom, isAtBottom])

  const handleSubmit = async () => {
    if (!inputValue.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      // First, save the user message as a comment (following ai-chatbot pattern)
      const userFormData = new FormData()
      userFormData.append('content', inputValue.trim())
      userFormData.append('todoId', todoId.toString())

      // Add optimistic user comment
      const optimisticUserComment: CommentWithUser = {
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

      startTransition(() => {
        addOptimisticComment(optimisticUserComment)
      })

      // Save user comment to database
      await addComment(userFormData)

      // Then send to AI for response
      await append({
        role: 'user',
        content: inputValue.trim(),
      })

      setInputValue('')
      localStorage.removeItem(`todo-chat-input-${todoId}`)
      resetHeight()
    } finally {
      setIsSubmitting(false)
    }
  }

  const shouldShowHeader = (message: ActivityMessage, index: number) => {
    if (index === 0) return true

    const prevMessage = activityMessages[index - 1]
    if (message.type !== prevMessage.type) return true

    // Group comments by user (both regular and AI comments)
    if (message.user?.id !== prevMessage.user?.id) {
      return true
    }

    // Check time difference for messages from the same user
    const prevTime = new Date(prevMessage.createdAt)
    const currentTime = new Date(message.createdAt)
    const timeDiff = currentTime.getTime() - prevTime.getTime()
    const oneHour = 60 * 60 * 1000

    return timeDiff > oneHour
  }

  return (
    <div className="space-y-4">
      {/* Unified Activity Feed */}
      <div className="space-y-2" ref={messagesContainerRef}>
        {activityMessages.map((message, index) => {
          const showHeader = shouldShowHeader(message, index)
          const isActivity = isActivityLog(message.content)

          // Render activity logs in simple inline format
          if (isActivity) {
            const userName =
              message.type === 'ai'
                ? 'AI Assistant'
                : message.user?.name || message.user?.email || 'Someone'

            // Handle reasoning entries differently
            if (isReasoningLog(message.content)) {
              const { thinking } = extractThinking(message.content)
              const reasoningContent = thinking || message.content

              return (
                <div
                  key={message.id}
                  className="flex items-start gap-3 py-1 px-2 text-sm"
                >
                  <Avatar className="h-6 w-6 ring-1 ring-gray-200 shadow-sm">
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">
                        {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <MessageReasoning
                      isLoading={false}
                      reasoning={reasoningContent}
                    />
                  </div>
                </div>
              )
            }

            // Handle regular activity entries
            // Clean up the content for activity display
            let cleanContent = message.content

            return (
              <div
                key={message.id}
                className="flex items-center gap-3 py-1 px-2 text-sm text-gray-600 bg-gray-50/50 rounded-md"
              >
                <Avatar className="h-6 w-6 ring-1 ring-white shadow-sm">
                  {message.type === 'ai' ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <>
                      <AvatarImage
                        src={message.user?.image || undefined}
                        alt={
                          message.user?.name || message.user?.email || 'User'
                        }
                      />
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                        {message.user?.name?.[0]?.toUpperCase() ||
                          message.user?.email?.[0]?.toUpperCase() ||
                          'U'}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div className="flex-1 flex items-center justify-between">
                  <span>
                    <span className="font-medium">{userName}</span>{' '}
                    {cleanContent.toLowerCase()}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            )
          }

          // Render regular comments as chat bubbles
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
                          src={message.user?.image || undefined}
                          alt={
                            message.user?.name || message.user?.email || 'User'
                          }
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
                        message.user?.name || message.user?.email || 'User'
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(message.createdAt), 'PPp')}
                    </span>
                  </div>
                )}
                <div
                  className={`text-sm whitespace-pre-wrap ${
                    message.type === 'ai' ? 'text-gray-700' : 'text-gray-700'
                  }`}
                >
                  {message.type === 'ai'
                    ? (() => {
                        const { thinking, mainContent } = extractThinking(
                          message.content,
                        )
                        return (
                          <>
                            {thinking && (
                              <MessageReasoning
                                isLoading={false}
                                reasoning={thinking}
                              />
                            )}
                            {mainContent && (
                              <div className={thinking ? 'mt-3' : ''}>
                                {mainContent}
                              </div>
                            )}
                            <MessageActions content={message.content} />
                          </>
                        )
                      })()
                    : message.content}
                </div>
              </div>
            </div>
          )
        })}

        {/* Show AI thinking state */}
        {isAiLoading && (
          <div className="flex gap-3 group">
            <div className="flex flex-col items-center">
              <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  <span className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    AI Assistant
                  </span>
                </span>
                <span className="text-xs text-gray-500">now</span>
              </div>
              <div className="text-sm text-gray-700">
                <MessageReasoning isLoading={true} reasoning="" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages end ref for scrolling */}
      <div ref={messagesEndRef} />

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="fixed bottom-20 right-4">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToBottom}
            className="rounded-full shadow-lg"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

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
                AI assistant is currently unavailable. Please try again.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={inputValue}
                onChange={handleTextareaChange}
                placeholder="Ask the AI assistant anything about this task..."
                className="min-h-[80px] resize-none pr-10"
                disabled={isPending || isAiLoading || isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                ref={textareaRef}
              />
              <div className="absolute top-2 right-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={
                !inputValue.trim() || isPending || isAiLoading || isSubmitting
              }
              size="sm"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            💡 The AI assistant has full context of this task and can help make
            changes
          </div>
        </div>
      </div>
    </div>
  )
}
