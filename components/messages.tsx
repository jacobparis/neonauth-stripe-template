import type { UIMessage } from 'ai'
import { PreviewMessage, ThinkingMessage } from './message'
import { memo } from 'react'
import equal from 'fast-deep-equal'
import type { UseChatHelpers } from '@ai-sdk/react'
import { format, isSameDay } from 'date-fns'

interface MessagesProps {
  chatId: string
  status: UseChatHelpers['status']
  messages: Array<UIMessage>
  setMessages: UseChatHelpers['setMessages']
  reload: UseChatHelpers['reload']
  isReadonly: boolean
}

function PureMessages({
  chatId,
  status,
  messages,
  setMessages,
  reload,
  isReadonly,
}: MessagesProps) {
  return (
    <div className="flex flex-col min-w-0 pt-4">
      {messages.map((message, index) => {
        const showDateHeader =
          index === 0 ||
          !isSameDay(
            new Date(messages[index - 1].createdAt || new Date()),
            new Date(message.createdAt || new Date()),
          )

        return (
          <div key={message.id}>
            {showDateHeader && (
              <div className="flex items-center justify-center py-4">
                <div className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border">
                  {format(
                    new Date(message.createdAt || new Date()),
                    'MMMM d, yyyy',
                  )}
                </div>
              </div>
            )}
            <PreviewMessage
              chatId={chatId}
              message={message}
              isLoading={
                status === 'streaming' && messages.length - 1 === index
              }
              setMessages={setMessages}
              reload={reload}
              isReadonly={isReadonly}
              requiresScrollPadding={false}
            />
          </div>
        )
      })}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}
    </div>
  )
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false
  if (prevProps.status && nextProps.status) return false
  if (prevProps.messages.length !== nextProps.messages.length) return false
  if (!equal(prevProps.messages, nextProps.messages)) return false

  return true
})
