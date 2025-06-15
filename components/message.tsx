'use client'

import type { UIMessage } from 'ai'
import { memo, useState } from 'react'
import { Markdown } from './markdown'
import { MessageActions } from './message-actions'
import equal from 'fast-deep-equal'
import { cn, sanitizeText } from '@/lib/utils'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { MessageEditor } from './message-editor'
import { MessageReasoning } from './message-reasoning'
import type { UseChatHelpers } from '@ai-sdk/react'
import { PencilIcon, SparklesIcon, User } from 'lucide-react'
import { PreviewAttachment } from './preview-attachment'
import { formatDistanceToNow } from 'date-fns'

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

  return (
    <div className="group/message">
      <div className="flex items-start gap-3 p-4 rounded-lg hover:bg-muted/50 transition-colors">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
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
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-foreground">
              {message.role === 'assistant' ? 'AI Assistant' : 'You'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.createdAt || new Date()), {
                addSuffix: true,
              })}
            </span>
            {message.role === 'user' && !isReadonly && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover/message:opacity-100 h-6 w-6 p-0 ml-auto"
                    onClick={() => setMode('edit')}
                  >
                    <PencilIcon className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit message</TooltipContent>
              </Tooltip>
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

          {/* Actions */}
          {!isReadonly && message.role === 'assistant' && (
            <div className="mt-3 opacity-0 group-hover/message:opacity-100 transition-opacity">
              <MessageActions
                chatId={chatId}
                message={message}
                isLoading={isLoading}
              />
            </div>
          )}
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
