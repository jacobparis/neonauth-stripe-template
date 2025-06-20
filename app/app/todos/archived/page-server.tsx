import { ArchivedTodosPageClient } from './page-client'
import { getArchivedTodos } from '@/lib/actions'
import { getRateLimitStatus } from '@/lib/rate-limit'
import { Suspense } from 'react'
import TodosLoading from '../loading'
import { unstable_cache as cache } from 'next/cache'

export async function ArchivedTodosPageServer({ userId }: { userId: string }) {
  const [archivedTodos, rateLimitStatus] = await cache(
    async (id: string) => {
      return Promise.all([getArchivedTodos(id), getRateLimitStatus(id)])
    },
    [userId],
    {
      tags: [`${userId}:archived-todos`],
      revalidate: 60,
    },
  )(userId)

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
