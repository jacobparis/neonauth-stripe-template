import { TodosPageClient } from './page-client'
import { stackServerApp } from '@/stack'
import { getTodos } from '@/lib/actions'
import { getRateLimitStatus } from '@/lib/rate-limit'
import { Suspense } from 'react'
import TodosLoading from './loading'

export default async function TodosPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' })

  const [todos, rateLimitStatus] = await Promise.all([
    getTodos(),
    getRateLimitStatus(user.id),
  ])

  return (
    <Suspense fallback={<TodosLoading />}>
      <TodosPageClient
        todos={todos}
        userId={user.id}
        rateLimitStatus={rateLimitStatus}
      />
    </Suspense>
  )
}
