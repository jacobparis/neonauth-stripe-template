import { stackServerApp } from '@/stack'
import { ArchivedTodosPageServer } from './page-server'

export default async function ArchivedTodosPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' })

  return <ArchivedTodosPageServer userId={user.id} />
}
