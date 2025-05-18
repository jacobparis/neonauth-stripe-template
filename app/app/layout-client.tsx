"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import {
  Settings,
  Home,
  Plus,
  Search,
  CheckCircle,
  Circle,
  AlertCircleIcon,
  Clock,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useUser } from "@stackframe/stack"
import { useStackApp } from "@stackframe/stack"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createIssue } from "@/lib/issue-actions"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const user = useUser()
  const app = useStackApp()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentView = searchParams.get("view") || "all"
  const [searchOpen, setSearchOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const { toast } = useToast()

  // Handle creating a new issue
  const handleCreateIssue = async (formData: FormData) => {
    setCreateError(null)
    setIsPending(true)

    const title = formData.get("title") as string

    if (!title) {
      setCreateError("Title is required")
      setIsPending(false)
      return
    }

    try {
      const result = await createIssue(formData)

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        setIsDialogOpen(false)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
        setCreateError(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create issue",
        variant: "destructive",
      })
      setCreateError("Failed to create issue")
    } finally {
      setIsPending(false)
    }
  }

  // Handle navigation to filtered views
  const navigateToView = (view: string) => {
    router.push(`/app?view=${view}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top navigation bar */}
      <header className="w-full flex gap-x-2 items-center py-1.5 z-10 border-b border-border/40 px-3 h-12">
        <div className="font-bold text-base tracking-tight">
          <Link href="/app" className="hover:opacity-80 transition-opacity">
            NEON
          </Link>
        </div>

        <div className="relative flex-1 max-w-md">
          {searchOpen ? (
            <div className="absolute inset-0 z-10 flex items-center">
              <Input
                autoFocus
                placeholder="Search issues..."
                className="h-8 bg-muted/50 border-muted"
                onBlur={() => setSearchOpen(false)}
              />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full justify-start text-muted-foreground bg-muted/50 border-muted"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs">Search issues...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          )}
        </div>

        <div className="grow" />

        {user ? (
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
        ) : (
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
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Linear-style sidebar */}
        <aside className="w-48 border-r border-border/40 flex flex-col h-[calc(100vh-3rem)] overflow-y-auto">
          <div className="p-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-start gap-1.5 bg-primary/90 hover:bg-primary h-7 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Issue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Issue</DialogTitle>
                  <DialogDescription>
                    Add a new issue to track. Be descriptive to help with
                    resolution.
                  </DialogDescription>
                </DialogHeader>
                <form action={handleCreateIssue}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label htmlFor="title" className="text-sm font-medium">
                        Title
                      </label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Brief description of the issue"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <label
                        htmlFor="description"
                        className="text-sm font-medium"
                      >
                        Description
                      </label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Detailed explanation of the issue"
                        rows={4}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="priority" className="text-sm font-medium">
                        Priority
                      </label>
                      <Select name="priority" defaultValue="medium">
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {createError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{createError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "Creating..." : "Create Issue"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <nav className="space-y-0.5 px-1.5 mt-1">
            <Link
              href="/app"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md",
                pathname === "/app" && !searchParams.toString()
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
              )}
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link
              href="/app/issues"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md",
                pathname.startsWith("/app/issues")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
              )}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              My Issues
            </Link>
          </nav>

          <div className="mt-4 px-2">
            <h3 className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1.5">
              VIEWS
            </h3>
            <nav className="space-y-0.5">
              <button
                onClick={() => navigateToView("all")}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md w-full text-left",
                  currentView === "all"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
                )}
              >
                <Circle className="h-3.5 w-3.5" />
                All Issues
              </button>
              <button
                onClick={() => navigateToView("active")}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md w-full text-left",
                  currentView === "active"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Active
              </button>
              <button
                onClick={() => navigateToView("backlog")}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md w-full text-left",
                  currentView === "backlog"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
                )}
              >
                <AlertCircleIcon className="h-3.5 w-3.5" />
                Backlog
              </button>
            </nav>
          </div>

          <div className="mt-auto p-2">
            <ThemeToggle />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
