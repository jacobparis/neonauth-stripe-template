import { stackServerApp } from '@/stack'
import { TodosPageServer } from './page-server'

export default async function TodosPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' })

  return <TodosPageServer userId={user.id} />
}
