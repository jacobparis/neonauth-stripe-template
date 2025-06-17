'use client'

import type { UIMessage } from 'ai'
import { memo, useState } from 'react'
import { Markdown } from './markdown'
import equal from 'fast-deep-equal'
import { cn, sanitizeText } from '@/lib/utils'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { MessageEditor } from './message-editor'
import { MessageReasoning } from './message-reasoning'
import type { UseChatHelpers } from '@ai-sdk/react'
import { PencilIcon, SparklesIcon, User, CopyIcon } from 'lucide-react'
import { PreviewAttachment } from './preview-attachment'
import { formatDistanceToNow } from 'date-fns'
import { useCopyToClipboard } from 'usehooks-ts'
import { toast } from 'sonner'

const PurePreviewMessage = ({
  chatId,
  message,
  isLoading,
  setMessages,
  reload,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string
  message: UIMessage
  isLoading: boolean
  setMessages: UseChatHelpers['setMessages']
  reload: UseChatHelpers['reload']
  isReadonly: boolean
  requiresScrollPadding: boolean
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [_, copyToClipboard] = useCopyToClipboard()

  // Check for activity message metadata
  const isActivityMessage = (message as any).metadata?.isActivity === true

  if (isActivityMessage) {
    return (
      <div className="flex items-start gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">You</span>{' '}
              {message.content || (message.parts?.[0] as any)?.text}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {formatDistanceToNow(new Date(message.createdAt || new Date()), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group/message">
      <div className="flex items-start gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {message.role === 'assistant' ? (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 mt-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-foreground">
              {message.role === 'assistant' ? 'AI Assistant' : 'You'}
            </span>
            {!isReadonly && (
              <div className="flex items-center gap-2 ml-auto opacity-0 group-hover/message:opacity-100">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(
                    new Date(message.createdAt || new Date()),
                    {
                      addSuffix: true,
                    },
                  )}
                </span>
                {message.role === 'user' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setMode('edit')}
                      >
                        <PencilIcon className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit message</TooltipContent>
                  </Tooltip>
                )}
                {message.role === 'assistant' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={async () => {
                          const textFromParts = message.parts
                            ?.filter((part) => part.type === 'text')
                            .map((part) => part.text)
                            .join('\n')
                            .trim()

                          if (!textFromParts) {
                            toast.error("There's no text to copy!")
                            return
                          }

                          await copyToClipboard(textFromParts)
                          toast.success('Copied to clipboard!')
                        }}
                      >
                        <CopyIcon className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          {/* Attachments */}
          {message.experimental_attachments &&
            message.experimental_attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

          {/* Message Content */}
          {message.parts?.map((part, index) => {
            const key = `message-${message.id}-part-${index}`

            if (part.type === 'reasoning') {
              return (
                <div key={key} className="mb-3">
                  <MessageReasoning
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                </div>
              )
            }

            if (part.type === 'text') {
              if (mode === 'edit') {
                return (
                  <div key={key} className="mt-2">
                    <MessageEditor
                      message={message}
                      setMode={setMode}
                      setMessages={setMessages}
                      reload={reload}
                    />
                  </div>
                )
              }

              return (
                <div
                  key={key}
                  className="prose prose-sm max-w-none dark:prose-invert"
                >
                  <div className="text-foreground leading-relaxed">
                    <Markdown>{sanitizeText(part.text)}</Markdown>
                  </div>
                </div>
              )
            }

            if (part.type === 'tool-invocation') {
              const { toolInvocation } = part
              const { toolName, toolCallId, state } = toolInvocation

              if (state === 'call') {
                return (
                  <div
                    key={toolCallId}
                    className="bg-muted/50 rounded-md p-3 mb-2"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      Tool: {toolName}
                    </div>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(toolInvocation.args, null, 2)}
                    </pre>
                  </div>
                )
              }

              if (state === 'result') {
                return (
                  <div
                    key={toolCallId}
                    className="bg-green-50 dark:bg-green-900/20 rounded-md p-3 mb-2"
                  >
                    <div className="text-xs text-green-600 dark:text-green-400 mb-1">
                      Result: {toolName}
                    </div>
                    <pre className="text-xs overflow-x-auto text-green-700 dark:text-green-300">
                      {JSON.stringify(toolInvocation.result, null, 2)}
                    </pre>
                  </div>
                )
              }
            }

            return null
          })}
        </div>
      </div>
    </div>
  )
}

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false
    if (prevProps.message.id !== nextProps.message.id) return false
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false
    return true
  },
)

export const ThinkingMessage = () => {
  return (
    <div className="group/message">
      <div className="flex items-start gap-3 p-4 rounded-lg">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-white animate-pulse" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-foreground">AI Assistant</span>
            <span className="text-xs text-muted-foreground">thinking...</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <div
                className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
            <span className="text-sm">Processing your request</span>
          </div>
        </div>
      </div>
    </div>
  )
}
