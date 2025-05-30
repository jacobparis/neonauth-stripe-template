'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { toggleWatchTodo } from '@/lib/actions'
import { useRouter } from 'next/navigation'

export function WatchButtonClient({
  todoId,
  initialIsWatching,
}: {
  todoId: number
  initialIsWatching: boolean
}) {
  const [isWatching, setIsWatching] = useState(initialIsWatching)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleToggleWatch = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', todoId.toString())
      formData.append('watch', (!isWatching).toString())
      await toggleWatchTodo(formData)
      setIsWatching(!isWatching)
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
