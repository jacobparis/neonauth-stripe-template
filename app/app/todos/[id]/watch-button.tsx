import { getTaskWatchers } from '@/app/api/notifications/notifications'
import { WatchButtonClient } from './watch-button-client'

export async function WatchButton({
  todoId,
  userId,
}: {
  todoId: number
  userId: string
}) {
  const watchers = await getTaskWatchers({ taskId: todoId })
  const isWatching = watchers.includes(userId)

  return <WatchButtonClient todoId={todoId} initialIsWatching={isWatching} />
}
