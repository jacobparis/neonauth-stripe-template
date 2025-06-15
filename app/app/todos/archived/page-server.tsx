import { ArchivedTodosPageClient } from './page-client'
import { getArchivedTodos } from '@/lib/actions'
import { getRateLimitStatus } from '@/lib/rate-limit'
import { Suspense } from 'react'
import TodosLoading from '../loading'
import { unstable_cacheTag as cacheTag } from 'next/cache'

export async function ArchivedTodosPageServer({ userId }: { userId: string }) {
  'use cache'
  cacheTag(`${userId}:archived-todos`)

  const [archivedTodos, rateLimitStatus] = await Promise.all([
    getArchivedTodos(userId),
    getRateLimitStatus(userId),
  ])

  return (
    <Suspense fallback={<TodosLoading />}>
      <ArchivedTodosPageClient
        todos={archivedTodos}
        userId={userId}
        rateLimitStatus={rateLimitStatus}
      />
    </Suspense>
  )
}
