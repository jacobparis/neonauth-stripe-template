"use client"

import Link from "next/link"
import Image from "next/image"
import { Settings, MoreHorizontal } from "lucide-react"
import { useUser } from "@stackframe/stack"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function AppUserSettings() {
  const user = useUser()

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className="inline-flex h-7 items-center justify-center rounded-md px-3 text-xs font-medium text-foreground/80 transition-all hover:bg-secondary/80"
        >
          Log In
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex h-7 items-center justify-center font-medium text-center rounded-md outline-hidden bg-primary hover:bg-primary/90 whitespace-nowrap px-3 py-1 text-xs transition-colors duration-200"
        >
          Sign Up
        </Link>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-7 px-2 ml-2 rounded-full"
        >
          {user.profileImageUrl ? (
            <Image
              src={user.profileImageUrl || "/placeholder.svg"}
              alt="User avatar"
              width={20}
              height={20}
              className="rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-foreground/80 text-xs">
                {user.displayName
                  ? user.displayName[0].toUpperCase()
                  : "U"}
              </span>
            </div>
          )}
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="dark:bg-card dark:border-border/50"
      >
        <DropdownMenuItem asChild>
          <Link
            href="/app/settings/profile"
            className="flex items-center gap-2"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/handler/sign-out"
            className="flex items-center gap-2"
          >
            Sign Out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
