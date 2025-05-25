import { TodosPageClient } from './page-client'
import { db } from '@/lib/db'
import { todos } from '@/drizzle/schema'
import { desc } from 'drizzle-orm'
import { getStripePlan } from '@/app/api/stripe/plans'
import { stackServerApp } from '@/stack'
import { getTodos, getUserTodoMetrics } from '@/lib/actions'
import { Suspense } from 'react'
import TodosLoading from './loading'

export default async function TodosPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' })

  const [todos, userMetrics] = await Promise.all([
    getTodos(),
    user ? getUserTodoMetrics(user.id) : Promise.resolve(null),
  ])

  // Get the total created todos and todo limit from the user metrics
  const todoLimit =
    userMetrics && !('error' in userMetrics) ? userMetrics.todoLimit : 10

  return (
    <Suspense fallback={<TodosLoading />}>
      <TodosPageClient
        todos={todos}
        todoLimit={todoLimit}
        userId={user.id}
        email={user.primaryEmail || ''}
        name={user.displayName}
      />
    </Suspense>
  )
}
