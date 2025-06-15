import { TodosPageClient } from './page-client'
import { getTodos } from '@/lib/actions'
import { getRateLimitStatus } from '@/lib/rate-limit'
import { Suspense } from 'react'
import TodosLoading from './loading'
import { unstable_cacheTag as cacheTag } from 'next/cache'

export async function TodosPageServer({ userId }: { userId: string }) {
  'use cache'
  cacheTag(`${userId}:todos`)

  const [todos, rateLimitStatus] = await Promise.all([
    getTodos(userId),
    getRateLimitStatus(userId),
  ])

  return (
    <Suspense fallback={<TodosLoading />}>
      <TodosPageClient
        todos={todos}
        userId={userId}
        rateLimitStatus={rateLimitStatus}
      />
    </Suspense>
  )
}
