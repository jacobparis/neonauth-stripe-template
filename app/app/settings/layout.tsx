import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  // This is a server component, so we need to use the pathname from the request
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

  return (
    <div className="container mx-auto py-8 px-4 flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 shrink-0">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <nav className="space-y-1">
          <Button
            asChild
            variant="ghost"
            className={cn(
              'w-full justify-start font-normal',
              pathname.includes('/app/settings/profile') && 'bg-secondary/50',
            )}
          >
            <Link href="/app/settings/profile">Profile</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className={cn(
              'w-full justify-start font-normal',
              pathname.includes('/app/settings/account') && 'bg-secondary/50',
            )}
          >
            <Link href="/app/settings/account">Account</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className={cn(
              'w-full justify-start font-normal',
              pathname.includes('/app/settings/activity') && 'bg-secondary/50',
            )}
          >
            <Link href="/app/settings/activity">Activity</Link>
          </Button>
        </nav>
      </aside>
      <main className="flex-1 max-w-3xl">{children}</main>
    </div>
  )
}
