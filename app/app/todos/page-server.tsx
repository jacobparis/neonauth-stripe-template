import { TodosPageClient } from './page-client'
import { stackServerApp } from '@/stack'
import { getTodos } from '@/lib/actions'
import { getRateLimitStatus } from '@/lib/rate-limit'
import { Suspense } from 'react'
import TodosLoading from './loading'
import { cacheTag } from 'next/dist/server/use-cache/cache-tag'

export async function TodosPageServer({ userId }: { userId: string }) {
  'use cache'
  cacheTag(userId, 'todos')

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
