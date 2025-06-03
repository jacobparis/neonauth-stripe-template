'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { toggleWatchTodo } from '@/lib/actions'
import { useRouter } from 'next/navigation'

export function WatchButtonClient({
  todoId,
  initialWatchers,
}: {
  todoId: string
  initialWatchers: string[]
}) {
  const [watchers, setWatchers] = useState(initialWatchers)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Check if current user is watching (we'll need to get user ID from context or props)
  const isWatching = watchers.length > 0 // Simplified for now

  const handleToggleWatch = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', todoId)
      formData.append('watch', (!isWatching).toString())
      await toggleWatchTodo(formData)
      // Update local state optimistically
      router.refresh()
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggleWatch}
      disabled={isPending}
      className={`flex items-center gap-1.5 ${
        isWatching
          ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
          : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {isWatching ? (
        <>
          <Eye className="h-4 w-4" />
          Watching
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4" />
          Watch
        </>
      )}
    </Button>
  )
}
