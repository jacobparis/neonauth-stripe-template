'use client'

import type { Attachment, UIMessage } from 'ai'
import { useChat } from '@ai-sdk/react'
import { useEffect, useState } from 'react'
import { fetchWithErrorHandlers } from '@/lib/utils'
import { MultimodalInput } from '@/components/multimodal-input'
import { Messages } from './messages'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { useAutoResume } from '@/hooks/use-auto-resume'
import { ChatSDKError } from '@/lib/errors'
import { nanoid } from 'nanoid'

export function Chat({
  id,
  initialMessages,
  isReadonly,
  autoResume,
}: {
  id: string
  initialMessages: Array<UIMessage>
  isReadonly: boolean
  autoResume: boolean
}) {
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    experimental_resume,
    data,
  } = useChat({
    id,
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: () => nanoid(),
    fetch: fetchWithErrorHandlers,
    experimental_prepareRequestBody: (body) => ({
      id,
      message: body.messages.at(-1),
      selectedChatModel: 'chat-model',
    }),
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast.error(error.message)
      }
    },
  })

  const searchParams = useSearchParams()
  const query = searchParams.get('query')

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false)

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: 'user',
        content: query,
      })

      setHasAppendedQuery(true)
      window.history.replaceState({}, '', `/app/todos/${id}`)
    }
  }, [query, append, hasAppendedQuery, id])

  const [attachments, setAttachments] = useState<Array<Attachment>>([])

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  })

  return (
    <div className="min-w-0 bg-background">
      <Messages
        chatId={id}
        status={status}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        isReadonly={isReadonly}
      />

      <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        {!isReadonly && (
          <MultimodalInput
            chatId={id}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            status={status}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
          />
        )}
      </form>
    </div>
  )
}
