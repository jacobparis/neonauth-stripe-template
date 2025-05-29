'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format, isValid } from 'date-fns'
import { deleteTodo } from '@/actions/delete-todos'
import { updateDueDate } from '@/actions/update-due-date'
import { toggleTodoCompleted } from '@/actions/toggle-completed'
import { updateTodo, toggleWatchTodo } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { CalendarIcon, ArrowLeft, Trash2, Eye, EyeOff } from 'lucide-react'
import type { Todo } from '@/drizzle/schema'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getTaskWatchers } from '@/app/api/notifications/notifications'

export function TodoItemPageClient({
  todo,
  todoLimit,
  userId,
  email,
  name,
}: {
  todo: Todo
  todoLimit: number
  userId: string
  email: string
  name: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState<Date | undefined>(
    todo.dueDate ? new Date(todo.dueDate) : undefined,
  )
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [title, setTitle] = useState(todo.title)
  const [description, setDescription] = useState(todo.description || '')

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTodo(todo.id)
      router.push('/app/todos')
    })
  }

  const handleToggleCompleted = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', todo.id.toString())
      formData.append('completed', (!todo.completed).toString())
      await toggleTodoCompleted(formData)
      router.refresh()
    })
  }

  const handleUpdateDueDate = (newDate: Date | undefined) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', todo.id.toString())
      formData.append('dueDate', newDate?.toISOString() || '')
      await updateDueDate(formData)
      router.refresh()
    })
    setDate(newDate)
    setIsCalendarOpen(false)
  }

  const handleUpdateTitle = (newTitle: string) => {
    setTitle(newTitle)
    startTransition(async () => {
      if (!newTitle.trim()) return
      const formData = new FormData()
      formData.append('id', todo.id.toString())
      formData.append('title', newTitle)
      await updateTodo(formData)
      router.refresh()
    })
  }

  const handleUpdateDescription = (newDescription: string) => {
    setDescription(newDescription)
    startTransition(async () => {
      if (!title.trim()) return
      const formData = new FormData()
      formData.append('id', todo.id.toString())
      formData.append('description', newDescription)
      await updateTodo(formData)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Task Header */}
      <div className="px-6 py-8 bg-gradient-to-b from-white/95 to-white/80">
        {/* Task Title */}
        <Input
          value={title}
          onChange={(e) => handleUpdateTitle(e.target.value)}
          className="w-full text-xl md:text-2xl text-gray-900 tracking-tight leading-tight bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
          placeholder="Task title..."
        />

        {/* Description */}
        <div className="mt-2">
          <Textarea
            value={description}
            onChange={(e) => handleUpdateDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full p-4 bg-gray-50/50 rounded-xl border border-gray-200 hover:bg-gray-50/80 focus:bg-white focus:border-gray-300 transition-all duration-200 resize-none min-h-[60px] text-base font-medium text-gray-700 placeholder:text-gray-500 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={3}
          />
        </div>

        {/* Task Controls */}
        <div className="flex items-center justify-between mt-2 p-4 bg-white/60 rounded-none shadow-none px-0 py-0">
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleCompleted}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                todo.completed
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {todo.completed ? 'Completed' : 'Done'}
            </Button>

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-2 text-sm text-gray-600 px-3 py-1.5 bg-gray-50/60 rounded-lg border border-gray-200/40 cursor-pointer">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {date && isValid(date)
                      ? format(date, 'MMMM do, yyyy')
                      : 'No due date'}
                  </span>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleUpdateDueDate}
                  initialFocus
                />
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleUpdateDueDate(undefined)}
                  >
                    Clear due date
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition-all duration-200"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>

        {/* Activity Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wide uppercase">
              Activity
            </h3>
            <WatchButton todoId={todo.id} userId={userId} />
          </div>
          <div className="space-y-4 mt-6">
            <div className="flex gap-3 group">
              <div className="flex flex-col items-center">
                <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                    {name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {name || email}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(todo.createdAt), 'PPP')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Created this task</p>
              </div>
            </div>
            {todo.updatedAt && (
              <div className="flex gap-3 group">
                <div className="flex flex-col items-center">
                  <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                      {name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {name || email}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(todo.updatedAt), 'PPP')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Updated this task</p>
                </div>
              </div>
            )}
          </div>

          {/* Add Comment */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200/40">
            <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                {name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200/40 hover:bg-gray-50/80 transition-all duration-200 cursor-text">
                <p className="text-sm text-gray-500 font-medium">
                  Add a comment...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WatchButton({ todoId, userId }: { todoId: number; userId: string }) {
  const [isWatching, setIsWatching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    getTaskWatchers({ taskId: todoId }).then((watchers) => {
      setIsWatching(watchers.includes(userId))
    })
  }, [todoId, userId])

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
      variant="ghost"
      size="sm"
      onClick={handleToggleWatch}
      disabled={isPending}
      className={`gap-2 ${
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
