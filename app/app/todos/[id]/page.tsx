import { stackServerApp } from '@/stack'
import { TodoItemPageServer } from './page-server'

export default async function TodoItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: todoId } = await params

  const user = await stackServerApp.getUser({ or: 'redirect' })

  return <TodoItemPageServer todoId={todoId} userId={user.id} />
}
