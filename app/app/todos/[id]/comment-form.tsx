'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useRef } from 'react'

interface CommentFormProps {
  todoId: string
  onSubmit?: (formData: FormData) => Promise<void>
  isPending?: boolean
}

export function CommentForm({ todoId, onSubmit, isPending }: CommentFormProps) {
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (formData: FormData) => {
    if (onSubmit) {
      await onSubmit(formData)
      formRef.current?.reset()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const formData = new FormData(formRef.current!)
      const content = formData.get('content') as string
      if (content?.trim()) {
        handleSubmit(formData)
      }
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex-1">
      <input type="hidden" name="todoId" value={todoId} />
      <div className="space-y-3">
        <Textarea
          name="content"
          placeholder="Add a comment..."
          className="min-h-[80px] resize-none border-gray-200/60 focus:border-orange-300 focus:ring-orange-200"
          disabled={isPending}
          onKeyDown={handleKeyDown}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isPending}
          >
            {isPending ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </div>
    </form>
  )
}
