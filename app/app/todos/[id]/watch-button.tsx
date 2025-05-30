import { getTaskWatchers } from '@/app/api/notifications/notifications'
import { WatchButtonClient } from './watch-button-client'
import { stackServerApp } from '@/stack'

export async function WatchButton({ todoId }: { todoId: number }) {
  const user = await stackServerApp.getUser({ or: 'redirect' })
  const watchers = await getTaskWatchers({ taskId: todoId })
  const isWatching = watchers.includes(user.id)

  return <WatchButtonClient todoId={todoId} initialIsWatching={isWatching} />
}
