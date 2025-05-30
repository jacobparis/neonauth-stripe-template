'use client'

import { useState, useTransition } from 'react'
import { addComment } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

export function CommentForm({ todoId }: { todoId: number }) {
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    if (!content.trim()) return

    startTransition(async () => {
      const result = await addComment(formData)
      if (result.success) {
        setContent('')
      }
    })
  }

  return (
    <div className="flex-1">
      <form action={handleSubmit} className="space-y-3">
        <input type="hidden" name="todoId" value={todoId} />
        <Textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px] border-gray-200/40 focus:border-orange-300 focus:ring-orange-200 resize-none"
          disabled={isPending}
        />
        {content.trim() && (
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !content.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Send className="h-4 w-4 mr-2" />
              {isPending ? 'Posting...' : 'Comment'}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
