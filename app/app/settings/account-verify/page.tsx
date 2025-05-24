import { redirect } from 'next/navigation'
import { stackServerApp } from '@/stack'
import { verifyContactChannel } from '../profile/actions'
import { PageProps } from '@/lib/utils'

export default async function AccountPage({ searchParams }: PageProps) {
  const user = await stackServerApp.getUser({ or: 'redirect' })
  const { code } = await searchParams

  if (code && !Array.isArray(code)) {
    // Handle contact channel verification
    await verifyContactChannel({ code })
  }

  redirect('/app/settings/account')
}
