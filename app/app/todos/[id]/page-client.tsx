'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
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
import { updateTodo } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { CalendarIcon, Trash2 } from 'lucide-react'
import type { Todo } from '@/drizzle/schema'
import { useTodoState } from './todo-state-context'

export function TodoItemPageClient({ todo }: { todo: Todo }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get state from context
  const {
    date,
    title,
    setTitle,
    description,
    setDescription,
    completed,
    deleted,
    handleUpdateDueDate: contextHandleUpdateDueDate,
    handleToggleCompleted,
    handleToggleDeleted,
  } = useTodoState()

  const autoResize = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  useEffect(() => {
    autoResize()
  }, [description])

  const handleUpdateDueDate = (newDate: Date | undefined) => {
    contextHandleUpdateDueDate(newDate)
    setIsCalendarOpen(false)
  }

  const handleDelete = () => {
    handleToggleDeleted()
  }

  return (
    <div>
      {/* Task Header */}
      <div className="mt-8">
        <form action={updateTodo}>
          <input type="hidden" name="id" value={todo.id} />
          {/* Task Title */}
          <Input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => e.target.form?.requestSubmit()}
            className="w-full text-xl md:text-2xl text-foreground tracking-tight leading-tight bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            placeholder="Task title..."
          />

          {/* Description */}
          <div className="mt-2">
            <Textarea
              ref={textareaRef}
              name="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                autoResize()
              }}
              onBlur={(e) => {
                const input = e.target
                if (input.value !== description) {
                  const form = input.form
                  form?.requestSubmit()
                }
              }}
              placeholder="Add a description..."
              className="w-full p-4 rounded-xl resize-none border-none hover:bg-muted/80 focus:bg-card focus:border-border transition-all duration-200 min-h-[60px] text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 overflow-hidden"
            />
          </div>

          {/* Task Controls */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleCompleted}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  completed
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-muted text-foreground border-border hover:bg-muted/80'
                }`}
              >
                {completed ? 'Completed' : 'Done'}
              </Button>

              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 bg-muted/60 rounded-lg border border-border/40 cursor-pointer">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
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
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                deleted
                  ? 'text-orange-700 hover:text-orange-800 hover:bg-orange-50 border-orange-200'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {deleted ? 'Restore' : 'Archive'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
