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
import { UserSelector } from './user-selector'
import { UserAvatar } from './user-avatar'
import { Progress } from '@/components/ui/progress'
import { groupTodosByDueDate } from './utils'
import { Textarea } from '@/components/ui/textarea'

// Extend User type to include profileImageUrl from Stack Auth
type UserWithProfile = User & {
  profileImageUrl: string | null
}

// Track all edits in one place
type PendingEdit =
  | { type: 'delete'; ids: Set<number> }
  | { type: 'reschedule'; ids: Set<number>; dueDate: Date | null }
  | { type: 'toggleCompleted'; ids: Set<number>; completed: boolean }
  | { type: 'add'; todo: Todo }

function AddTodoForm({
  onClose,
  setPendingEdits,
  users,
  currentUserId,
}: {
  onClose: () => void
  setPendingEdits: React.Dispatch<React.SetStateAction<PendingEdit[]>>
  users: UserWithProfile[]
  currentUserId: string
}) {
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(
    undefined,
  )
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [todoText, setTodoText] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    currentUserId,
  )

  async function handleAction(formData: FormData) {
    const text = formData.get('text') as string

    if (!text?.trim()) return

    // Add due date to form data if selected
    if (selectedDueDate) {
      formData.append('dueDate', selectedDueDate.toISOString())
    }

    // Add assigned user to form data
    if (selectedUserId) {
      formData.append('assignedToId', selectedUserId)
    }

    // Create an optimistic todo with a temporary negative ID
    const optimisticTodo: Todo = {
      id: -Math.floor(Math.random() * 1000) - 1,
      title: text,
      description: null,
      completed: false,
      dueDate: selectedDueDate || null,
      assignedToId: selectedUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setPendingEdits((prev) => [...prev, { type: 'add', todo: optimisticTodo }])

    // Reset form state
    setTodoText('')
    setSelectedDueDate(undefined)
    setSelectedUserId(currentUserId)
    onClose()

    // Send the actual request (non-blocking)
    addTodo(formData)
  }

  return (
    <div className="relative w-full flex flex-col gap-4">
      <form action={handleAction} className="relative">
        <Textarea
          name="text"
          placeholder="What needs to be done?"
          value={todoText}
          onChange={(e) => setTodoText(e.target.value)}
          className="min-h-[24px] max-h-[calc(75dvh)] resize-none rounded-2xl !text-base bg-muted pb-20 dark:border-zinc-700"
          rows={2}
          autoFocus
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              if (todoText.trim()) {
                const formData = new FormData()
                formData.append('text', todoText)
                if (selectedDueDate) {
                  formData.append('dueDate', selectedDueDate.toISOString())
                }
                if (selectedUserId) {
                  formData.append('assignedToId', selectedUserId)
                }
                handleAction(formData)
              }
            }
          }}
        />

        {/* Assignment and Date Controls */}
        <div className="absolute bottom-0 left-0 p-2 flex items-center gap-2">
          <UserSelector
            users={users}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
            triggerClassName="h-8 px-2 text-xs"
          />

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
            disabled={!todoText.trim()}
          >
            <Plus className="h-4 w-4" />
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
  users,
}: {
  todo: Todo
  isSelected: boolean
  onToggleSelect: (id: number, selected: boolean) => void
  onDelete: (id: number) => void
  onToggleCompleted: (id: number, completed: boolean) => void
  onUpdateDueDate: (id: number, date: Date | null) => void
  users: UserWithProfile[]
}) {
  const assignedUser = users.find((user) => user.id === todo.assignedToId)

  return (
    <div
      className={`grid grid-cols-subgrid col-span-5 px-2 py-1.5 gap-4 ${
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
            className={`data-[state=checked]:bg-muted0 data-[state=checked]:text-white data-[state=checked]:border-muted0 ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } transition-opacity`}
            aria-label="Select todo for bulk actions"
          />
        </div>

        {assignedUser ? (
          <UserAvatar
            user={{
              name: assignedUser.name,
              avatarUrl: assignedUser.profileImageUrl,
            }}
            showName={false}
            className="text-xs"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">?</span>
          </div>
        )}

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

      <div className="flex items-center">
        {/* Empty middle column since assignee moved to first column */}
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
  users,
}: {
  todos: Todo[]
  todoLimit: number
  userId: string
  email: string
  name: string | null
  users: UserWithProfile[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTodoIds, setSelectedTodoIds] = useState(
    () => new Set<number>(),
  )
  const [isRescheduleCalendarOpen, setIsRescheduleCalendarOpen] =
    useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(
    undefined,
  )
  const [isAddTodoOpen, setIsAddTodoOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
      // Remove optimistic todo if a real todo with the same title and assignment exists
      return !current.some(
        (realTodo) =>
          realTodo.title === optimisticTodo.title &&
          realTodo.assignedToId === optimisticTodo.assignedToId &&
          realTodo.id > 0, // Real todos have positive IDs
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
    setPendingEdits((prev) => [...prev, { type: 'delete', ids: new Set([id]) }])
    setSelectedTodoIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    deleteTodo(id)
  }, [])

  const handleToggleCompleted = useCallback(
    (id: number, completed: boolean) => {
      setPendingEdits((prev) => [
        ...prev,
        { type: 'toggleCompleted', ids: new Set([id]), completed },
      ])
      const formData = new FormData()
      formData.append('id', id.toString())
      formData.append('completed', completed.toString())
      toggleTodoCompleted(formData)
    },
    [],
  )

  const handleUpdateDueDate = useCallback((id: number, date: Date | null) => {
    setPendingEdits((prev) => [
      ...prev,
      { type: 'reschedule', ids: new Set([id]), dueDate: date },
    ])
    const formData = new FormData()
    formData.append('id', id.toString())
    formData.append('dueDate', date?.toISOString() || '')
    updateDueDate(formData)
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
      </div>

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
                  className="data-[state=checked]:bg-muted0 data-[state=checked]:text-white data-[state=checked]:border-muted0"
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
                  className="data-[state=checked]:bg-muted0 data-[state=checked]:text-white data-[state=checked]:border-muted0"
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
        ) : filteredTodos.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No todos match your search
          </p>
        ) : (
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto]">
            {todoGroups.map((group) => (
              <div
                key={group.label}
                className={`rounded-lg mt-4 col-span-5 grid grid-cols-subgrid ${
                  group.label === 'Today' ? 'bg-muted dark:bg-muted' : ''
                }`}
              >
                {/* Date Header */}
                <div className={`col-span-5 px-2 py-2`}>
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
                        users={users}
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

      <div className="mt-8">
        <AddTodoForm
          onClose={() => {}}
          setPendingEdits={setPendingEdits}
          users={users}
          currentUserId={userId}
        />
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
