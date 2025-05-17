"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { Settings } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useUser } from "@stackframe/stack"
import { useStackApp } from "@stackframe/stack"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  { label: "Dashboard", href: "/app" },
]

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const user = useUser()
  const app = useStackApp()
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full flex gap-x-4 items-center py-1 z-10 border-b border-border/40 px-4">
        <div className="font-bold text-lg tracking-tight">
          <Link href="/app" className="hover:opacity-80 transition-opacity">
            NEON AUTH
          </Link>
        </div>

         {navItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            asChild
            className={cn(
              "h-8 text-xs px-2 relative",
              pathname === item.href &&
                "text-primary after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-1 after:bg-primary rounded-b-none",
            )}
          >
          
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}

        <div className="grow" />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 px-2 ml-2 rounded-full">
                {user.displayName && <span className="text-xs text-foreground/80">{user.displayName}</span>}
                {user.profileImageUrl ? (
                  <Image
                    src={user.profileImageUrl || "/placeholder.svg"}
                    alt="User avatar"
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-foreground/80 text-xs">
                      {user.displayName ? user.displayName[0].toUpperCase() : "U"}
                    </span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-card dark:border-border/50">
              <DropdownMenuItem asChild>
                <Link href="/app/settings/profile" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/handler/sign-out" className="flex items-center gap-2">
                  Sign Out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex h-8 items-center justify-center rounded-md px-4 text-[13px] font-medium text-foreground/80 transition-all hover:bg-secondary/80"
            >
              Log In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-8 items-center justify-center font-medium text-center rounded-md outline-hidden bg-primary hover:bg-primary/90 whitespace-nowrap px-4 py-1 text-[13px] transition-colors duration-200"
            >
              Sign Up
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1 flex">{children}</main>
    </div>
  )
}
