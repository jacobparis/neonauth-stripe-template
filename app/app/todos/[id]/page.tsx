import { TodoItemPageClient } from './page-client'
import { getTodo, getUserTodoMetrics } from '@/lib/actions'
import { stackServerApp } from '@/stack'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Import the loading component
import TodoItemLoading from './loading'

export default async function TodoItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const todoId = parseInt(id, 10)

  if (isNaN(todoId)) {
    notFound()
  }

  const user = await stackServerApp.getUser({ or: 'redirect' })

  try {
    const [todo, userMetrics] = await Promise.all([
      getTodo(todoId),
      user ? getUserTodoMetrics(user.id) : Promise.resolve(null),
    ])

    // Get the total created todos and todo limit from the user metrics
    const todoLimit =
      userMetrics && !('error' in userMetrics) ? userMetrics.todoLimit : 10

    return (
      <div>
        {/* Back button */}
        <div>
          <Button variant="ghost" asChild size="sm">
            <Link href="/app/todos">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to todos</span>
            </Link>
          </Button>
        </div>
        <Suspense fallback={<TodoItemLoading />}>
          <TodoItemPageClient
            todo={todo}
            todoLimit={todoLimit}
            userId={user.id}
            email={user.primaryEmail || ''}
            name={user.displayName}
          />
        </Suspense>
      </div>
    )
  } catch (error) {
    notFound()
  }
}
