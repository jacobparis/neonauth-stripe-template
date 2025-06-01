import type React from 'react'
import Link from 'next/link'
import { AppUserSettings } from '@/components/app-user-settings'
import { StackProvider, StackTheme } from '@stackframe/stack'
import { stackServerApp } from '@/stack'
import { NotificationsMenu } from '@/app/components/notifications'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StackProvider app={stackServerApp}>
      <StackTheme>
        <div className="min-h-screen flex flex-col bg-background">
          {/* Top navigation bar */}
          <header className="w-full flex gap-x-4 items-center py-1.5 z-10 border-b border-border/40 px-3 h-12">
            <div className="font-bold text-base tracking-tight">
              <Link href="/app" className="hover:opacity-80 transition-opacity">
                NEONAUTH+STRIPE TEMPLATE
              </Link>
            </div>

            <Link
              href="/app/todos"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Todos
            </Link>

            <div className="grow" />

            <NotificationsMenu />
            <AppUserSettings />
          </header>

          <div className="flex flex-1">
            {/* Main content */}
            <main className="flex-1 max-w-screen-md mx-auto w-full">
              {children}
            </main>
          </div>
        </div>
      </StackTheme>
    </StackProvider>
  )
}
