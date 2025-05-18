"use client"
import { useState } from "react"
import type React from "react"

import { addTodo } from "@/lib/actions"
import { deleteTodo, bulkDeleteTodos } from "@/actions/delete-todos"
import { bulkUpdateDueDate } from "@/actions/update-due-date"
import { bulkUpdateProject } from "@/actions/update-project"
import { bulkToggleCompleted } from "@/actions/toggle-completed"
import { toggleCompleted } from "@/actions/toggle-completed"
import { updateDueDate as updateDueDateAction } from "@/actions/update-due-date"
import { Plus, Trash, X, Tag, CalendarIcon } from "lucide-react"
import type { Todo, Project } from "@/lib/schema"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ProjectSelector } from "./project-selector"
import { ProjectBadge } from "./project-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function AddTodoForm({
  onAddTodo,
  onClose,
  projects,
  onProjectAdded,
}: {
  onAddTodo: (todo: Todo) => void
  onClose: () => void
  projects: Project[]
  onProjectAdded?: (project: Project) => void
}) {
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(undefined)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [todoText, setTodoText] = useState("")

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  async function handleAction(formData: FormData) {
    const text = formData.get("text") as string

    if (!text?.trim()) return

    // Add due date to form data if selected
    if (selectedDueDate) {
      formData.append("dueDate", selectedDueDate.toISOString())
    }

    // Add project ID to form data if selected
    if (selectedProjectId !== null) {
      formData.append("projectId", selectedProjectId.toString())
    }

    // Create an optimistic todo with a temporary negative ID
    const optimisticTodo: Todo = {
      id: -Math.floor(Math.random() * 1000) - 1,
      text,
      completed: false,
      dueDate: selectedDueDate || null,
      projectId: selectedProjectId,
      userId: null,
      ownerId: null,
    }

    // Add optimistic todo to the UI
    onAddTodo(optimisticTodo)

    // Reset form state
    setTodoText("")
    setSelectedDueDate(undefined)
    setSelectedProjectId(null)
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
        <ProjectSelector
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onProjectAdded={onProjectAdded}
          asChild
        >
          {selectedProject ? (
            <button type="button">
              <ProjectBadge project={selectedProject} className="mr-2" />
            </button>
          ) : (
            <Button type="button" variant="outline" size="xs">
              <Tag className="h-3 w-3 mr-1" />
              <span>Project</span>
            </Button>
          )}
        </ProjectSelector>

        <div className="flex items-center gap-2">
          <Popover modal open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="xs">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {selectedDueDate ? format(selectedDueDate, "PPP") : "Select a date"}
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
      </div>

      <Button type="submit">
        <Plus className="h-4 w-4 mr-2" />
        Add deadline
      </Button>
    </form>
  )
}

export function TodosPageClient({
  todos: initialTodos,
  projects,
  todoLimit,
}: {
  todos: Todo[]
  projects: Project[]
  todoLimit: number
}) {
  const [todos, setTodos] = useState(initialTodos)
  const [newTodoText, setNewTodoText] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [dueDate, setDueDate] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTodoIds, setSelectedTodoIds] = useState<Set<number>>(new Set())
  const [isAddTodoOpen, setIsAddTodoOpen] = useState(false)
  const [isRescheduleCalendarOpen, setIsRescheduleCalendarOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<Date>()
  const [optimisticProjects, setOptimisticProjects] = useState<Project[]>(projects)

  // Track pending bulk edits
  type PendingEdit =
    | { type: "delete"; ids: Set<number> }
    | { type: "reschedule"; ids: Set<number>; dueDate: Date | null }
    | { type: "moveToProject"; ids: Set<number>; projectId: number | null }
    | { type: "toggleCompleted"; ids: Set<number>; completed: boolean }

  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([])

  // Optimistic state management for single-todo actions
  const [optimisticTodos, updateOptimisticTodos] = useState<Todo[]>(initialTodos)

  // Apply pending edits to todos
  const displayedTodos = optimisticTodos
    .map((todo) => {
      const current = { ...todo }

      for (const edit of pendingEdits) {
        if (!edit.ids.has(todo.id)) continue

        switch (edit.type) {
          case "delete":
            return null
          case "reschedule":
            current.dueDate = edit.dueDate
            break
          case "moveToProject":
            current.projectId = edit.projectId
            break
          case "toggleCompleted":
            current.completed = edit.completed
            break
        }
      }

      return current
    })
    .filter((todo): todo is Todo => todo !== null)

  // Delete multiple todos
  function deleteSelectedTodos() {
    const idsToDelete = Array.from(selectedTodoIds)

    setPendingEdits((prev) => [...prev, { type: "delete", ids: new Set(idsToDelete) }])
    setSelectedTodoIds(new Set())

    // Send the actual request
    bulkDeleteTodos(idsToDelete)
  }

  // Reschedule multiple todos
  function rescheduleSelectedTodos(date: Date | undefined) {
    const idsToReschedule = Array.from(selectedTodoIds)

    if (idsToReschedule.length === 0) return

    setPendingEdits((prev) => [
      ...prev,
      {
        type: "reschedule",
        ids: new Set(idsToReschedule),
        dueDate: date || null,
      },
    ])

    // Close calendar but don't clear selection
    setIsRescheduleCalendarOpen(false)

    // Send the actual request
    bulkUpdateDueDate(idsToReschedule, { dueDate: date?.toISOString() || null })
  }

  // Move multiple todos to a project
  function moveSelectedTodosToProject(projectId: number | null) {
    const idsToMove = Array.from(selectedTodoIds)

    if (idsToMove.length === 0) return

    setPendingEdits((prev) => [
      ...prev,
      {
        type: "moveToProject",
        ids: new Set(idsToMove),
        projectId,
      },
    ])

    // Send the actual request
    bulkUpdateProject(idsToMove, { projectId })
  }

  // Mark multiple todos as completed/uncompleted
  function markSelectedTodosAs(completed: boolean) {
    const idsToToggle = Array.from(selectedTodoIds)

    if (idsToToggle.length === 0) return

    setPendingEdits((prev) => [
      ...prev,
      {
        type: "toggleCompleted",
        ids: new Set(idsToToggle),
        completed,
      },
    ])

    // Send the actual request
    bulkToggleCompleted(idsToToggle, { completed })
  }

  // Select or deselect a todo
  function toggleTodoSelection(id: number, selected: boolean) {
    setSelectedTodoIds((prev) => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }

  // Select or deselect all visible todos
  function toggleSelectAll(selected: boolean) {
    if (selected) {
      // Select all visible todos
      const newSelection = new Set(selectedTodoIds)
      displayedTodos.forEach((todo) => {
        newSelection.add(todo.id)
      })
      setSelectedTodoIds(newSelection)
    } else {
      // Deselect all
      setSelectedTodoIds(new Set())
    }
  }

  // Handle adding a new project
  function handleProjectAdded(project: Project) {
    setOptimisticProjects((prev) => [...prev, project])
  }

  // Check if all visible todos are selected
  const allSelected = displayedTodos.length > 0 && displayedTodos.every((todo) => selectedTodoIds.has(todo.id))

  const selectedTodos = displayedTodos.filter((todo) => selectedTodoIds.has(todo.id))

  // Filter todos based on search query and project filter
  const filteredTodos = displayedTodos.filter((todo) => {
    return todo.text.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Add a function to handle single todo deletion
  function handleDeleteTodo(id: number) {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
    deleteTodo(id)
  }

  // Calculate metrics based on displayed todos
  const totalTodos = displayedTodos.length
  const isCurrentlyAtCapacity = totalTodos >= todoLimit

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append("text", newTodoText)
    if (selectedProjectId) {
      formData.append("projectId", selectedProjectId.toString())
    }
    if (dueDate) {
      formData.append("dueDate", dueDate)
    }

    const result = await addTodo(formData)
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    // Optimistically update the UI
    const newTodo: Todo = {
      id: Math.max(0, ...todos.map((t) => t.id)) + 1,
      text: newTodoText,
      completed: false,
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId: selectedProjectId,
      userId: null,
      ownerId: null,
    }

    setTodos([...todos, newTodo])
    setNewTodoText("")
    setSelectedProjectId(null)
    setDueDate("")
  }

  const handleToggleCompleted = async (id: number, completed: boolean) => {
    await toggleCompleted(id, !completed)

    // Optimistically update the UI
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !completed } : todo)))
  }

  const handleUpdateDueDate = async (id: number, newDate: string) => {
    await updateDueDateAction(id, newDate)

    // Optimistically update the UI
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, dueDate: newDate ? new Date(newDate) : null } : todo)),
    )
  }

  const getProjectById = (id: number | null) => {
    if (!id) return null
    return projects.find((p) => p.id === id) || null
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>
            Manage your tasks and deadlines ({totalTodos}/{todoLimit})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="flex items-end gap-2 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Add a new task..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                required
                disabled={isSubmitting || totalTodos >= todoLimit}
              />
            </div>
            <div>
              <ProjectSelector
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelect={setSelectedProjectId}
              />
            </div>
            <div>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-40" />
            </div>
            <Button type="submit" disabled={isSubmitting || totalTodos >= todoLimit}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </form>

          {error && <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-4">{error}</div>}

          <div className="space-y-2">
            {totalTodos === 0 ? (
              <div className="text-center py-6 text-muted-foreground">No tasks yet. Add your first task above.</div>
            ) : (
              displayedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    todo.completed && "bg-muted/50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleCompleted(todo.id, !!todo.completed)}
                      className="text-primary hover:text-primary/80"
                    >
                      {todo.completed ? <Plus className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    </button>
                    <span className={cn(todo.completed && "line-through text-muted-foreground")}>{todo.text}</span>
                    {todo.projectId && <ProjectBadge project={getProjectById(todo.projectId)} />}
                  </div>
                  <div className="flex items-center gap-2">
                    {todo.dueDate && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{format(new Date(todo.dueDate), "MMM d")}</span>
                      </Badge>
                    )}
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredTodos.filter((t) => t.completed).length} of {totalTodos} tasks completed
          </div>
        </CardFooter>
      </Card>
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
        <Button type="button" variant="outline" size="xs">
          <CalendarIcon className="h-4 w-4 mr-2" />
          {todo.dueDate ? (
            <span>
              Due{" "}
              {new Date(todo.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : (
            <span>Set due date</span>
          )}
        </Button>
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
