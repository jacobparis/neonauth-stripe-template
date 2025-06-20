import { TodosPageClient } from './page-client'
import { getTodos } from '@/lib/actions'
import { getRateLimitStatus } from '@/lib/rate-limit'
import { Suspense } from 'react'
import TodosLoading from './loading'
import {
  unstable_cacheTag as cacheTag,
  unstable_cache as cache,
} from 'next/cache'

export async function TodosPageServer({ userId }: { userId: string }) {
  const [todos, rateLimitStatus] = await cache(
    async (id: string) => {
      return Promise.all([getTodos(id), getRateLimitStatus(id)])
    },
    [userId],
    {
      tags: [`${userId}:todos`],
      revalidate: 60,
    },
  )(userId)

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
