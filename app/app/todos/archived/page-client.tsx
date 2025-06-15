'use client'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarIcon, Archive } from 'lucide-react'
import type { Todo } from '@/drizzle/schema'
import Link from 'next/link'
import { groupTodosByDueDate } from '../utils'

// Archived TodoItem component (simplified, read-only)
function ArchivedTodoItem({ todo }: { todo: Todo }) {
  return (
    <div className="grid grid-cols-subgrid col-span-4 px-2 py-1.5 gap-4 bg-muted/30 rounded-md relative">
      <div className="flex items-center gap-2">
        <div className="flex items-center h-5 pt-0.5">
          <Archive className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="min-w-0">
          <Link
            href={`/app/todos/${todo.id}`}
            prefetch={true}
            className="text-sm text-muted-foreground line-through hover:underline block truncate"
          >
            {todo.title}
          </Link>
        </div>
      </div>

      <div className="flex items-center">{/* Empty middle column */}</div>
      <div className="flex items-center">{/* Empty middle column */}</div>
    </div>
  )
}

export function ArchivedTodosPageClient({
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
  // Memoize the todo groups, excluding "Today" for archived items
  const todoGroups = useMemo(
    () => groupTodosByDueDate(todos).filter((group) => group.label !== 'Today'),
    [todos],
  )

  return (
    <div className="space-y-6 pb-40 mt-8">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex items-center gap-3">
          <Archive className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Archived Todos</h1>
        </div>
        <Link href="/app/todos">
          <Button variant="outline">Back to Active Todos</Button>
        </Link>
      </div>

      {/* Todo list */}
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2 h-8">
            <div className="text-sm font-medium">Archived Items</div>
          </div>
          <div className="text-sm text-muted-foreground">
            {todos.length} item{todos.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Todo Groups */}
        {todos.length === 0 ? (
          <div className="text-center py-8">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No archived todos yet.</p>
            <p className="text-sm text-muted-foreground">
              Deleted todos and overdue completed items will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_auto_auto]">
            {todoGroups.map((group) => (
              <div
                key={group.label}
                className="rounded-lg mt-4 col-span-4 grid grid-cols-subgrid"
              >
                {/* Date Header */}
                <div className="col-span-4 px-2 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {group.label}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Todos in this group */}
                {group.todos.length > 0 ? (
                  <div className="contents">
                    {group.todos.map((todo) => (
                      <ArchivedTodoItem key={todo.id} todo={todo} />
                    ))}
                  </div>
                ) : (
                  <div className="py-2 px-2 text-sm text-muted-foreground italic">
                    No archived items from {group.label.toLowerCase()}
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
