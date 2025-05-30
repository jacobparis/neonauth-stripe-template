import { TodosPageClient } from './page-client'
import { stackServerApp } from '@/stack'
import {
  getTodos,
  getUserTodoMetrics,
  getUsersWithProfiles,
} from '@/lib/actions'
import { Suspense } from 'react'
import TodosLoading from './loading'

export default async function TodosPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' })

  const [todos, userMetrics, users] = await Promise.all([
    getTodos(),
    user ? getUserTodoMetrics(user.id) : Promise.resolve(null),
    getUsersWithProfiles(),
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
        users={users}
      />
    </Suspense>
  )
}
