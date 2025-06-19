'use client'

import React, {
  createContext,
  useContext,
  useState,
  useTransition,
  useEffect,
} from 'react'
import { updateDueDate } from '@/actions/update-due-date'
import { toggleTodoCompleted } from '@/actions/toggle-completed'
import { deleteTodo } from '@/actions/delete-todos'
import { format } from 'date-fns'
import type { Todo } from '@/drizzle/schema'

export interface TodoStateHandlers {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  title: string
  setTitle: (title: string) => void
  description: string
  setDescription: (description: string) => void
  completed: boolean
  setCompleted: (completed: boolean) => void
  deleted: boolean
  setDeleted: (deleted: boolean) => void
  handleUpdateDueDate: (newDate: Date | undefined) => void
  handleToggleCompleted: () => void
  handleToggleDeleted: () => void
}

const TodoStateContext = createContext<TodoStateHandlers | null>(null)

export function useTodoState() {
  const context = useContext(TodoStateContext)
  if (!context) {
    throw new Error('useTodoState must be used within a TodoStateProvider')
  }
  return context
}

export function TodoStateProvider({
  todo,
  children,
}: {
  todo: Todo
  children: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState<Date | undefined>(
    todo.dueDate ? new Date(todo.dueDate) : undefined,
  )
  const [title, setTitle] = useState(todo.title)
  const [description, setDescription] = useState(todo.description || '')
  const [completed, setCompleted] = useState(todo.completed)
  const [deleted, setDeleted] = useState(!!todo.deletedAt)

  // Listen for AI tool optimistic updates
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{
        todoId: string
        type: 'title' | 'description' | 'dueDate' | 'completed'
        value: any
      }>
      if (custom.detail.todoId !== todo.id) return

      const { type, value } = custom.detail

      switch (type) {
        case 'title':
          setTitle(value)
          break
        case 'description':
          setDescription(value || '')
          break
        case 'dueDate':
          setDate(value ? new Date(value) : undefined)
          break
        case 'completed':
          setCompleted(value)
          break
      }
    }

    window.addEventListener('todo-optimistic-update', handler)
    return () => window.removeEventListener('todo-optimistic-update', handler)
  }, [todo.id])

  const handleUpdateDueDate = (newDate: Date | undefined) => {
    startTransition(async () => {
      await updateDueDate({ id: todo.id, dueDate: newDate || null })
    })
    setDate(newDate)

    // Dispatch optimistic activity event
    const message = newDate
      ? `Due date set to ${format(newDate, 'MM/dd/yyyy')}`
      : 'Due date removed'
    window.dispatchEvent(
      new CustomEvent('todo-activity', {
        detail: { todoId: todo.id, content: message },
      }),
    )
  }

  const handleToggleCompleted = () => {
    startTransition(async () => {
      await toggleTodoCompleted({ id: todo.id, completed: !completed })
    })
    setCompleted(!completed)

    const message = !completed ? 'Marked as completed' : 'Marked as incomplete'
    window.dispatchEvent(
      new CustomEvent('todo-activity', {
        detail: { todoId: todo.id, content: message },
      }),
    )
  }

  const handleToggleDeleted = () => {
    startTransition(async () => {
      await deleteTodo({ ids: todo.id, isDeleted: !deleted })
    })
    setDeleted(!deleted)

    const message = !deleted ? 'Archived' : 'Restored from archive'
    window.dispatchEvent(
      new CustomEvent('todo-activity', {
        detail: { todoId: todo.id, content: message },
      }),
    )
  }

  const stateHandlers: TodoStateHandlers = {
    date,
    setDate,
    title,
    setTitle,
    description,
    setDescription,
    completed,
    setCompleted,
    deleted,
    setDeleted,
    handleUpdateDueDate,
    handleToggleCompleted,
    handleToggleDeleted,
  }

  return (
    <TodoStateContext.Provider value={stateHandlers}>
      {children}
    </TodoStateContext.Provider>
  )
}
