'use client'
import {
  useOptimistic,
  useTransition,
  useState,
  useCallback,
  memo,
  useMemo,
} from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { addTodo } from '@/lib/actions'
import { deleteTodo, bulkDeleteTodos } from '@/actions/delete-todos'
import { updateDueDate, bulkUpdateDueDate } from '@/actions/update-due-date'
import { bulkToggleCompleted } from '@/actions/toggle-completed'
import { createSampleTodos } from '@/actions/create-sample-todos'
import { redirectToCheckout } from '@/app/api/stripe/client'
import {
  Search,
  Plus,
  Trash,
  X,
  AlertCircle,
  Clock,
  CalendarIcon,
  CreditCard,
  Zap,
  MoreVertical,
} from 'lucide-react'
import type { Todo } from '@/drizzle/schema'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { groupTodosByDueDate } from './utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

function AddTodoForm({
  onAddTodo,
  onClose,
}: {
  onAddTodo: (todo: Todo) => void
  onClose: () => void
}) {
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(
    undefined,
  )
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [todoText, setTodoText] = useState('')

  async function handleAction(formData: FormData) {
    const text = formData.get('text') as string

    if (!text?.trim()) return

    // Add due date to form data if selected
    if (selectedDueDate) {
      formData.append('dueDate', selectedDueDate.toISOString())
    }

    // Create an optimistic todo with a temporary negative ID
    const optimisticTodo: Todo = {
      id: -Math.floor(Math.random() * 1000) - 1,
      title: text,
      completed: false,
      dueDate: selectedDueDate || null,
      assignedToId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Add optimistic todo to the UI
    onAddTodo(optimisticTodo)

    // Reset form state
    setTodoText('')
    setSelectedDueDate(undefined)
    onClose()

    // Send the actual request (non-blocking)
    addTodo(formData)
  }

  return (
    <form action={handleAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="todo-text" className="text-sm font-medium">
          Task
        </label>
        <Input
          id="todo-text"
          type="text"
          name="text"
          placeholder="What needs to be done?"
          required
          value={todoText}
          onChange={(e) => setTodoText(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex items-center gap-2">
        <Popover modal open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {selectedDueDate
                ? format(selectedDueDate, 'PPP')
                : 'Select a date'}
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
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear date</span>
          </Button>
        )}
      </div>

      <Button type="submit">
        <Plus className="h-4 w-4 mr-2" />
        Add deadline
      </Button>
    </form>
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
  onToggleSelect: (id: number, selected: boolean) => void
  onDelete: (id: number) => void
  onToggleCompleted: (id: number, completed: boolean) => void
  onUpdateDueDate: (id: number, date: Date | null) => void
}) {
  return (
    <div
      className={`grid grid-cols-subgrid col-span-4 px-2 py-1.5 gap-4 ${
        todo.completed ? 'bg-muted/30' : ''
      } hover:bg-muted/20 relative group`}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center h-5 pt-0.5">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked: boolean) =>
              onToggleSelect(todo.id, checked)
            }
            className={`data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:border-blue-600 ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } transition-opacity`}
            aria-label="Select todo for bulk actions"
          />
        </div>

        <div className="min-w-0">
          <Link
            href={`/app/todos/${todo.id}`}
            className={`text-sm block truncate hover:underline ${
              todo.completed ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {todo.title}
          </Link>
        </div>
      </div>

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
  todoLimit,
  userId,
  email,
  name,
}: {
  todos: Todo[]
  todoLimit: number
  userId: string
  email: string
  name: string | null
}) {
  const [, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTodoIds, setSelectedTodoIds] = useState<Set<number>>(new Set())
  const [isRescheduleCalendarOpen, setIsRescheduleCalendarOpen] =
    useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(
    undefined,
  )
  const [isAddTodoOpen, setIsAddTodoOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Track pending bulk edits
  type PendingEdit =
    | { type: 'delete'; ids: Set<number> }
    | { type: 'reschedule'; ids: Set<number>; dueDate: Date | null }
    | { type: 'toggleCompleted'; ids: Set<number>; completed: boolean }

  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([])

  // Optimistic state management for single-todo actions
  const [optimisticTodos, updateOptimisticTodos] = useOptimistic(
    todos,
    (
      state,
      action:
        | { type: 'add'; todo: Todo }
        | { type: 'delete'; id: number }
        | { type: 'updateDueDate'; id: number; dueDate: Date | null }
        | { type: 'toggleCompleted'; id: number; completed: boolean },
    ) => {
      if (action.type === 'add') {
        return [...state, action.todo]
      } else if (action.type === 'delete') {
        return state.filter((todo) => todo.id !== action.id)
      } else if (action.type === 'updateDueDate') {
        return state.map((todo) =>
          todo.id === action.id ? { ...todo, dueDate: action.dueDate } : todo,
        )
      } else if (action.type === 'toggleCompleted') {
        return state.map((todo) =>
          todo.id === action.id
            ? { ...todo, completed: action.completed }
            : todo,
        )
      }
      return state
    },
  )

  // Memoize the displayed todos to prevent unnecessary recalculations
  const displayedTodos = useMemo(() => {
    return optimisticTodos
      .map((todo) => {
        const current = { ...todo }

        for (const edit of pendingEdits) {
          if (!edit.ids.has(todo.id)) continue

          switch (edit.type) {
            case 'delete':
              return null
            case 'reschedule':
              current.dueDate = edit.dueDate
              break
            case 'toggleCompleted':
              current.completed = edit.completed
              break
          }
        }

        return current
      })
      .filter(Boolean) as Todo[]
  }, [optimisticTodos, pendingEdits])

  // Memoize the filtered todos
  const filteredTodos = useMemo(
    () =>
      displayedTodos.filter((todo) =>
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [displayedTodos, searchQuery],
  )

  // Memoize the selected todos
  const selectedTodos = useMemo(
    () => displayedTodos.filter((todo) => selectedTodoIds.has(todo.id)),
    [displayedTodos, selectedTodoIds],
  )

  // Memoize the handlers
  const handleToggleSelect = useCallback((id: number, selected: boolean) => {
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

  const handleDelete = useCallback((id: number) => {
    startTransition(() => {
      updateOptimisticTodos({ type: 'delete', id })
      setSelectedTodoIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      deleteTodo(id)
    })
  }, [])

  const handleToggleCompleted = useCallback(
    (id: number, completed: boolean) => {
      startTransition(() => {
        updateOptimisticTodos({
          type: 'toggleCompleted',
          id,
          completed,
        })
        bulkToggleCompleted([id], completed)
      })
    },
    [],
  )

  const handleUpdateDueDate = useCallback((id: number, date: Date | null) => {
    startTransition(() => {
      updateOptimisticTodos({
        type: 'updateDueDate',
        id,
        dueDate: date,
      })
      const formData = new FormData()
      formData.append('id', id.toString())
      formData.append('dueDate', date?.toISOString() || '')
      updateDueDate(formData)
    })
  }, [])

  // Memoize the todo groups
  const todoGroups = useMemo(
    () => groupTodosByDueDate(filteredTodos),
    [filteredTodos],
  )

  // Delete multiple todos
  function deleteSelectedTodos() {
    const idsToDelete = Array.from(selectedTodoIds)

    setPendingEdits((prev) => [
      ...prev,
      { type: 'delete', ids: new Set(idsToDelete) },
    ])
    setSelectedTodoIds(new Set())

    // Send the actual request
    bulkDeleteTodos(idsToDelete)
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

    // Send the actual request (non-blocking)
    bulkUpdateDueDate(idsToReschedule, date || null)
  }

  // Mark multiple todos as completed/uncompleted
  function markSelectedTodosAs(completed: boolean) {
    const idsToToggle = Array.from(selectedTodoIds)
    setPendingEdits((prev) => [
      ...prev,
      { type: 'toggleCompleted', ids: selectedTodoIds, completed },
    ])
    setSelectedTodoIds(new Set())

    // Send the actual request (non-blocking)
    bulkToggleCompleted(idsToToggle, completed)
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
    <div className="space-y-6">
      {/* Productivity Metrics */}
      <div className="grid grid-cols-5 gap-4 mt-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              Active Deadlines
            </h3>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-2xl font-bold">
              {displayedTodos.length}/{todoLimit}
            </p>
            <p className="text-sm text-muted-foreground">
              {displayedTodos.length >= todoLimit ? (
                <span className="text-red-500 dark:text-red-400">
                  Upgrade to add more
                </span>
              ) : (
                <span>{todoLimit - displayedTodos.length} remaining</span>
              )}
            </p>
          </div>
          <Progress
            value={(displayedTodos.length / todoLimit) * 100}
            className={
              displayedTodos.length >= todoLimit
                ? 'bg-red-200 dark:bg-red-900'
                : ''
            }
          />
        </div>
      </div>

      {/* Search, Filter, and Add */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="-mt-[0.125rem] absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search todos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        <Dialog modal open={isAddTodoOpen} onOpenChange={setIsAddTodoOpen}>
          <DialogTrigger asChild>
            {displayedTodos.length >= todoLimit ? (
              <Button
                size="sm"
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950 gap-2"
              >
                <Zap className="h-4 w-4" />
                Upgrade to Pro to add more
              </Button>
            ) : (
              <Button size="sm">New deadline</Button>
            )}
          </DialogTrigger>
          <DialogContent>
            {displayedTodos.length >= todoLimit ? (
              <>
                <DialogHeader>
                  <DialogTitle>Todo Limit Reached</DialogTitle>
                  <DialogDescription>
                    You&apos;ve reached your limit of {todoLimit} active todos.
                    Delete some todos or upgrade to Pro for a higher limit.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Pro Plan Benefits</h3>
                        <p className="text-sm text-muted-foreground">
                          Higher todo limits and advanced features
                        </p>
                      </div>
                    </div>
                    <ul className="grid gap-2 mt-4 text-sm">
                      <li className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span>Up to {1000} active todos</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span>Full date range for planning</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={async () => {
                      setIsLoading(true)
                      try {
                        await redirectToCheckout({
                          userId,
                          email,
                          name,
                        })
                      } catch (error) {
                        console.error('Error redirecting to checkout:', error)
                        setIsLoading(false)
                      }
                    }}
                    className="w-full gap-2"
                    disabled={isLoading}
                  >
                    <CreditCard className="h-4 w-4" />
                    {isLoading ? 'Redirecting...' : 'Upgrade to Pro'}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Add New Todo</DialogTitle>
                </DialogHeader>
                <AddTodoForm
                  onAddTodo={(todo) =>
                    startTransition(() => {
                      updateOptimisticTodos({ type: 'add', todo })
                    })
                  }
                  onClose={() => setIsAddTodoOpen(false)}
                />
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Todo list */}
      <div className="border rounded-sm overflow-hidden">
        {/* Card Header with Bulk Actions */}
        <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b">
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
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:border-blue-600"
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
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:border-blue-600"
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All
                </label>
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredTodos.length} item
                {filteredTodos.length !== 1 ? 's ' : ' '}
                {filteredTodos.length !== displayedTodos.length && (
                  <span>matching {searchQuery}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Todo Groups */}
        {displayedTodos.length === 0 && !searchQuery ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No todos yet.</p>
            <form action={createSampleTodos}>
              <Button type="submit" variant="outline">
                Create sample todos
              </Button>
            </form>
          </div>
        ) : filteredTodos.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No todos match your search
          </p>
        ) : (
          <div className="grid grid-cols-[1fr_auto_auto_auto]">
            {todoGroups.map((group) => (
              <div
                key={group.label}
                className="col-span-4 grid grid-cols-subgrid"
              >
                {/* Date Header */}
                <div className={`col-span-4 px-2 py-2 border-t bg-muted/30}`}>
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
                    <span className="text-xs text-muted-foreground">
                      {group.todos.length} item
                      {group.todos.length !== 1 ? 's' : ''}
                    </span>
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
