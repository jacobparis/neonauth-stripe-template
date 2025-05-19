import type React from "react"
import Link from "next/link"
import { AppUserSettings } from "@/components/app-user-settings"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top navigation bar */}
      <header className="w-full flex gap-x-2 items-center py-1.5 z-10 border-b border-border/40 px-3 h-12">
        <div className="font-bold text-base tracking-tight">
          <Link href="/app" className="hover:opacity-80 transition-opacity">
            NEON
          </Link>
        </div>

        <div className="grow" />

        <AppUserSettings />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto max-w-screen-lg mx-auto w-full">{children}</main>
      </div>
    </div>
  )
}
