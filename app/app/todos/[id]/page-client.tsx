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
import { updateTodo } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { CalendarIcon, Trash2 } from 'lucide-react'
import type { Todo } from '@/drizzle/schema'

export function TodoItemPageClient({ todo }: { todo: Todo }) {
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
    startTransition(async () => {
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
            onChange={(e) => setDescription(e.target.value)}
            onBlur={(e) => handleUpdateDescription(e.target.value)}
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
                    variant="outline"
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
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition-all duration-200"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
