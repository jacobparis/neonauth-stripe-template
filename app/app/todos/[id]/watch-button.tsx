import { getTaskWatchers } from '@/app/api/notifications/notifications'
import { WatchButtonClient } from './watch-button-client'

export async function WatchButton({ todoId }: { todoId: string }) {
  const watchers = await getTaskWatchers({ taskId: todoId })

  return <WatchButtonClient todoId={todoId} initialWatchers={watchers} />
}
