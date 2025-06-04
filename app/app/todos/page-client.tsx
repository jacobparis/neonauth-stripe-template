'use client'
import { useState, useCallback, memo, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { addTodo } from '@/lib/actions'
import { deleteTodo } from '@/actions/delete-todos'
import { updateDueDate } from '@/actions/update-due-date'
import { toggleTodoCompleted } from '@/actions/toggle-completed'
import { createSampleTodos } from '@/actions/create-sample-todos'
import { redirectToCheckout } from '@/app/api/stripe/client'
import {
  Plus,
  Trash,
  X,
  AlertCircle,
  Clock,
  CalendarIcon,
  CreditCard,
  Zap,
  MoreVertical,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import type { Todo, User } from '@/drizzle/schema'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { groupTodosByDueDate } from './utils'
import { Textarea } from '@/components/ui/textarea'
import { generateTodoFromUserMessage } from '@/lib/actions'
import { nanoid } from 'nanoid'

// Track all edits in one place
type PendingEdit =
  | { type: 'delete'; ids: Set<string> }
  | { type: 'reschedule'; ids: Set<string>; dueDate: Date | null }
  | { type: 'toggleCompleted'; ids: Set<string>; completed: boolean }
  | { type: 'add'; todo: Todo }

function AddTodoForm({
  onClose,
  setPendingEdits,
  rateLimitStatus,
}: {
  onClose: () => void
  setPendingEdits: React.Dispatch<React.SetStateAction<PendingEdit[]>>
  rateLimitStatus: {
    remaining: number
    reset: number
  }
}) {
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(
    undefined,
  )
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [todoText, setTodoText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleAction(formData: FormData) {
    const text = formData.get('text') as string

    if (!text?.trim()) return

    setIsGenerating(true)

    try {
      // Generate a clean title from the prompt
      const generatedResult = await generateTodoFromUserMessage({
        prompt: text.trim(),
      })
      const finalTitle = generatedResult?.title || text.trim()
      const parsedDueDate = generatedResult?.dueDate
        ? new Date(generatedResult.dueDate)
        : null
      const finalDueDate = parsedDueDate || selectedDueDate

      // Create an optimistic todo with a temporary nanoid
      const optimisticTodo: Todo = {
        id: `temp-${nanoid(8)}`,
        title: finalTitle,
        description: null,
        completed: false,
        dueDate: finalDueDate || null,
        userId: '', // Will be set by server
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setPendingEdits((prev) => [
        ...prev,
        { type: 'add', todo: optimisticTodo },
      ])

      // Prepare form data for server action
      const serverFormData = new FormData()
      serverFormData.append('text', finalTitle)
      if (finalDueDate) {
        serverFormData.append('dueDate', finalDueDate.toISOString())
      }

      // Send the actual request (non-blocking)
      addTodo(serverFormData)

      // Reset form state
      setTodoText('')
      setSelectedDueDate(undefined)
      onClose()
    } catch (error) {
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="relative w-full flex flex-col gap-4">
      <form action={handleAction} className="relative">
        <Textarea
          name="text"
          placeholder="Describe what needs to be done... (e.g., 'Review the marketing proposal by Friday')"
          value={todoText}
          onChange={(e) => setTodoText(e.target.value)}
          className="min-h-[24px] max-h-[calc(75dvh)] resize-none rounded-xl !text-base bg-muted pb-20 dark:border-zinc-700"
          rows={2}
          autoFocus
          disabled={isGenerating}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              !isGenerating
            ) {
              event.preventDefault()
              if (todoText.trim()) {
                const formData = new FormData()
                formData.append('text', todoText)
                if (selectedDueDate) {
                  formData.append('dueDate', selectedDueDate.toISOString())
                }
                handleAction(formData)
              }
            }
          }}
        />

        {/* Date Controls */}
        <div className="absolute bottom-0 left-0 p-2 flex items-center gap-2">
          <Popover modal open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                {selectedDueDate
                  ? format(selectedDueDate, 'MMM d')
                  : 'Due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDueDate}
                onSelect={(date) => {
                  setSelectedDueDate(date)
                  setIsCalendarOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {selectedDueDate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDueDate(undefined)}
              className="h-8 px-1"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Submit Button */}
        <div className="absolute bottom-0 right-0 p-2">
          <Button
            type="submit"
            className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
            disabled={!todoText.trim() || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Memoized TodoItem component
const TodoItem = memo(function TodoItem({
  todo,
  isSelected,
  onToggleSelect,
  onDelete,
  onToggleCompleted,
  onUpdateDueDate,
}: {
  todo: Todo
  isSelected: boolean
  onToggleSelect: (id: string, selected: boolean) => void
  onDelete: (id: string) => void
  onToggleCompleted: (id: string, completed: boolean) => void
  onUpdateDueDate: (id: string, date: Date | null) => void
}) {
  return (
    <div
      className={`grid grid-cols-subgrid col-span-4 px-2 py-1.5 gap-4 hover:bg-muted rounded-md relative group transition-colors`}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center h-5 pt-0.5">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked: boolean) =>
              onToggleSelect(todo.id, checked)
            }
            className={`data-[state=checked]:bg-muted0 data-[state=checked]:text-white data-[state=checked]:border-muted0 ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } transition-opacity`}
            aria-label="Select todo for bulk actions"
          />
        </div>

        <div className="min-w-0">
          <Link
            href={`/app/todos/${todo.id}`}
            prefetch={true}
            className={`text-sm block truncate hover:underline ${
              todo.completed ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {todo.title}
          </Link>
        </div>
      </div>

      <div className="flex items-center">{/* Empty middle column */}</div>

      <div className="flex items-center gap-2 justify-end -mr-2">
        {!todo.completed && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onToggleCompleted(todo.id, true)}
          >
            Done
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="More options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <TodoDueDateButton
                todo={todo}
                onSelect={(date) => onUpdateDueDate(todo.id, date)}
              />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(todo.id)}>
              <Trash className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
})

export function TodosPageClient({
  todos,
  userId,
  rateLimitStatus,
}: {
  todos: Todo[]
  userId: string
  rateLimitStatus: {
    remaining: number
    reset: number
  }
}) {
  const [selectedTodoIds, setSelectedTodoIds] = useState(
    () => new Set<string>(),
  )
  const [isRescheduleCalendarOpen, setIsRescheduleCalendarOpen] =
    useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(
    undefined,
  )
  // Track all edits in one place
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([])

  // Memoize the displayed todos to prevent unnecessary recalculations
  const displayedTodos = useMemo(() => {
    let current = [...todos]

    // Filter out optimistic todos that now have real counterparts from the server
    const optimisticTodos = pendingEdits
      .filter((edit) => edit.type === 'add')
      .map((edit) => (edit as { type: 'add'; todo: Todo }).todo)

    const validOptimisticTodos = optimisticTodos.filter((optimisticTodo) => {
      // Remove optimistic todo if a real todo with the same title exists
      return !current.some(
        (realTodo) =>
          realTodo.title === optimisticTodo.title &&
          !realTodo.id.startsWith('temp-'), // Real todos don't have temp- prefix
      )
    })

    for (const edit of pendingEdits) {
      if (edit.type === 'add') {
        // Only add optimistic todos that don't have real counterparts
        if (validOptimisticTodos.includes(edit.todo)) {
          current = [...current, edit.todo]
        }
      } else {
        current = current
          .map((todo) => {
            if (!edit.ids.has(todo.id)) return todo

            switch (edit.type) {
              case 'delete':
                return null
              case 'reschedule':
                return { ...todo, dueDate: edit.dueDate }
              case 'toggleCompleted':
                return { ...todo, completed: edit.completed }
            }
          })
          .filter(Boolean) as Todo[]
      }
    }

    return current
  }, [todos, pendingEdits])

  // Memoize the selected todos
  const selectedTodos = useMemo(
    () => displayedTodos.filter((todo) => selectedTodoIds.has(todo.id)),
    [displayedTodos, selectedTodoIds],
  )

  // Memoize the handlers
  const handleToggleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedTodoIds((prev) => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }, [])

  const handleDelete = useCallback((id: string) => {
    setPendingEdits((prev) => [...prev, { type: 'delete', ids: new Set([id]) }])
    setSelectedTodoIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    deleteTodo(id)
  }, [])

  const handleToggleCompleted = useCallback(
    (id: string, completed: boolean) => {
      setPendingEdits((prev) => [
        ...prev,
        { type: 'toggleCompleted', ids: new Set([id]), completed },
      ])
      const formData = new FormData()
      formData.append('id', id)
      formData.append('completed', completed.toString())
      toggleTodoCompleted(formData)
    },
    [],
  )

  const handleUpdateDueDate = useCallback((id: string, date: Date | null) => {
    setPendingEdits((prev) => [
      ...prev,
      { type: 'reschedule', ids: new Set([id]), dueDate: date },
    ])
    const formData = new FormData()
    formData.append('id', id)
    formData.append('dueDate', date?.toISOString() || '')
    updateDueDate(formData)
  }, [])

  // Memoize the todo groups
  const todoGroups = useMemo(
    () => groupTodosByDueDate(displayedTodos),
    [displayedTodos],
  )

  // Delete multiple todos
  function deleteSelectedTodos() {
    const idsToDelete = Array.from(selectedTodoIds)

    setPendingEdits((prev) => [
      ...prev,
      { type: 'delete', ids: new Set(idsToDelete) },
    ])
    setSelectedTodoIds(new Set())

    // The server action handles batching/scheduling
    deleteTodo(idsToDelete)
  }

  // Reschedule multiple todos
  function rescheduleSelectedTodos(date: Date | undefined) {
    const idsToReschedule = Array.from(selectedTodoIds)
    setPendingEdits((prev) => [
      ...prev,
      { type: 'reschedule', ids: selectedTodoIds, dueDate: date || null },
    ])
    setSelectedTodoIds(new Set())
    setIsRescheduleCalendarOpen(false)

    // The server action handles batching/scheduling
    const formData = new FormData()
    formData.append('ids', JSON.stringify(idsToReschedule))
    formData.append('dueDate', date?.toISOString() || '')
    updateDueDate(formData)
  }

  // Mark multiple todos as completed/uncompleted
  function markSelectedTodosAs(completed: boolean) {
    const idsToToggle = Array.from(selectedTodoIds)
    setPendingEdits((prev) => [
      ...prev,
      { type: 'toggleCompleted', ids: selectedTodoIds, completed },
    ])
    setSelectedTodoIds(new Set())

    // The server action handles batching/scheduling
    const formData = new FormData()
    formData.append('ids', JSON.stringify(idsToToggle))
    formData.append('completed', completed.toString())
    toggleTodoCompleted(formData)
  }

  // Select or deselect all visible todos
  function toggleSelectAll(selected: boolean) {
    if (selected) {
      // Select all visible todos at once
      setSelectedTodoIds(new Set(displayedTodos.map((todo) => todo.id)))
    } else {
      // Deselect all
      setSelectedTodoIds(new Set())
    }
  }

  return (
    <div className="space-y-6 pb-40 mt-8">
      {/* Todo list */}
      <div>
        {/* Card Header with Bulk Actions */}
        <div className="flex items-center justify-between px-2 py-1">
          {selectedTodoIds.size > 0 ? (
            <>
              {/* Selection Mode Header */}
              <div className="flex items-center gap-2 h-8">
                <Checkbox
                  id="select-all"
                  checked={
                    selectedTodos.length > 0 && displayedTodos.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                  className="data-[state=checked]:bg-muted data-[state=checked]:text-white data-[state=checked]:border-muted"
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  {selectedTodoIds.size} selected
                </label>
              </div>
              <div className="flex items-center gap-2">
                {!selectedTodos.every((todo) => todo.completed) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => markSelectedTodosAs(true)}
                  >
                    Done
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => markSelectedTodosAs(false)}
                  >
                    Not done
                  </Button>
                )}

                <Popover
                  open={isRescheduleCalendarOpen}
                  onOpenChange={setIsRescheduleCalendarOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Reschedule
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-2 border-b">
                      <h3 className="text-sm font-medium">
                        Reschedule {selectedTodoIds.size} item
                        {selectedTodoIds.size !== 1 ? 's' : ''}
                      </h3>
                    </div>
                    <Calendar
                      mode="single"
                      selected={rescheduleDate}
                      onSelect={(date) => {
                        setRescheduleDate(date)
                      }}
                      initialFocus
                    />
                    <div className="p-2 border-t flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          rescheduleSelectedTodos(undefined)
                        }}
                      >
                        Clear Date
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsRescheduleCalendarOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            if (rescheduleDate) {
                              rescheduleSelectedTodos(rescheduleDate)
                            }
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="sm" onClick={deleteSelectedTodos}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Normal Mode Header */}
              <div className="flex items-center gap-2 h-8">
                <Checkbox
                  id="select-all"
                  checked={
                    selectedTodos.length > 0 && displayedTodos.length > 0
                  }
                  onCheckedChange={(checked: boolean) => {
                    toggleSelectAll(checked)
                  }}
                  className="data-[state=checked]:bg-muted data-[state=checked]:text-white data-[state=checked]:border-muted"
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All
                </label>
              </div>
              <div className="text-sm text-muted-foreground">
                {displayedTodos.length} item
                {displayedTodos.length !== 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>

        {/* Todo Groups */}
        {displayedTodos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No todos yet.</p>
            <Button
              onClick={async () => {
                const result = await createSampleTodos()
                // The server action will trigger a revalidation of the page
                // so we don't need to do anything with the result
              }}
              variant="outline"
            >
              Create sample todos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_auto_auto]">
            {todoGroups.map((group) => (
              <div
                key={group.label}
                className={`rounded-lg mt-4 col-span-4 grid grid-cols-subgrid`}
              >
                {/* Date Header */}
                <div className={`col-span-4 px-2 py-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {group.isPast ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-muted"
                          onClick={() => {
                            const allSelected = group.todos.every((todo) =>
                              selectedTodoIds.has(todo.id),
                            )
                            const newSelection = new Set(selectedTodoIds)
                            group.todos.forEach((todo) => {
                              if (allSelected) {
                                newSelection.delete(todo.id)
                              } else {
                                newSelection.add(todo.id)
                              }
                            })
                            setSelectedTodoIds(newSelection)
                          }}
                        >
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      <h3
                        className={`text-sm font-medium ${
                          group.isPast ? 'text-red-600 dark:text-red-400' : ''
                        }`}
                      >
                        {group.label}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Todos in this group or empty state */}
                {group.todos.length > 0 ? (
                  <div className="contents">
                    {group.todos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        isSelected={selectedTodoIds.has(todo.id)}
                        onToggleSelect={handleToggleSelect}
                        onDelete={handleDelete}
                        onToggleCompleted={handleToggleCompleted}
                        onUpdateDueDate={handleUpdateDueDate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-2 px-2 text-sm text-muted-foreground italic">
                    {group.label === 'Today'
                      ? 'Nothing due today'
                      : `No items due ${group.label.toLowerCase()}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Floating Footer with Todo Form */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto max-w-4xl p-4">
          <AddTodoForm
            onClose={() => {}}
            setPendingEdits={setPendingEdits}
            rateLimitStatus={rateLimitStatus}
          />

          {/* Message Rate Limit Counter */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-2">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{rateLimitStatus.remaining} messages remaining today</span>
            </div>
            {rateLimitStatus.remaining === 0 ? (
              <span className="text-red-500 dark:text-red-400">
                Resets in{' '}
                {Math.ceil(
                  (rateLimitStatus.reset - Date.now()) / (1000 * 60 * 60),
                )}
                h
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom padding to account for fixed footer */}
      <div className="h-32"></div>
    </div>
  )
}

// Helper component for the Todo's due date button and popover
function TodoDueDateButton({
  todo,
  onSelect,
}: {
  todo: Todo
  onSelect: (date: Date | null) => void
}) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <Popover modal open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <PopoverTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <CalendarIcon className="h-3.5 w-3.5 mr-2" />
          {todo.dueDate ? (
            <span>
              Due{' '}
              {new Date(todo.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          ) : (
            <span>Set due date</span>
          )}
        </DropdownMenuItem>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-2 border-b">
          <h3 className="text-sm font-medium">Set Due Date</h3>
        </div>
        <div className="p-0">
          <Calendar
            mode="single"
            selected={todo.dueDate ? new Date(todo.dueDate) : undefined}
            onSelect={(date: Date | undefined) => {
              onSelect(date || null)
              setIsCalendarOpen(false)
            }}
            initialFocus
          />
        </div>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              onSelect(null)
            }}
          >
            Clear due date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
