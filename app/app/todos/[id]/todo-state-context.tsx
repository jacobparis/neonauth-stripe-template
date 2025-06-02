'use client'

import React, {
  createContext,
  useContext,
  useState,
  useTransition,
} from 'react'
import { updateDueDate } from '@/actions/update-due-date'
import { toggleTodoCompleted } from '@/actions/toggle-completed'
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
  handleUpdateDueDate: (newDate: Date | undefined) => void
  handleToggleCompleted: () => void
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

  const handleUpdateDueDate = (newDate: Date | undefined) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', todo.id.toString())
      formData.append('dueDate', newDate?.toISOString() || '')
      await updateDueDate(formData)
    })
    setDate(newDate)
  }

  const handleToggleCompleted = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', todo.id.toString())
      formData.append('completed', (!completed).toString())
      await toggleTodoCompleted(formData)
    })
    setCompleted(!completed)
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
    handleUpdateDueDate,
    handleToggleCompleted,
  }

  return (
    <TodoStateContext.Provider value={stateHandlers}>
      {children}
    </TodoStateContext.Provider>
  )
}
