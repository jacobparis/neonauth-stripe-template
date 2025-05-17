"use client"

import { useState, useTransition, useOptimistic } from "react"
import { createIssue, updateIssueStatus, updateIssuePriority, deleteIssue } from "@/lib/issue-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  ChevronDown,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  ArrowUpCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import type { Issue } from "@/lib/db/schema"

interface IssueTrackerProps {
  initialIssues: Issue[]
  isPro: boolean
  issueCount: number
}

// Define the types of optimistic actions we can perform
type OptimisticAction =
  | { type: "create-issue"; issue: Issue }
  | { type: "update-status"; id: number; status: string }
  | { type: "update-priority"; id: number; priority: string }
  | { type: "delete-issue"; id: number }

// Define sort columns and directions
type SortColumn = "issue_number" | "title" | "status" | "priority" | "created_at"
type SortDirection = "asc" | "desc"

export function IssueTracker({ initialIssues, isPro, issueCount: initialIssueCount }: IssueTrackerProps) {
  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>("issue_number")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Modify the useOptimistic hook to never reorder items
  const [optimisticIssues, addOptimisticAction] = useOptimistic(initialIssues, (state, action: OptimisticAction) => {
    // Return a new state based on the action WITHOUT sorting
    switch (action.type) {
      case "create-issue":
        return [...state, action.issue]
      case "update-status":
        return state.map((issue) =>
          issue.id === action.id ? { ...issue, status: action.status, updated_at: new Date().toISOString() } : issue,
        )
      case "update-priority":
        return state.map((issue) =>
          issue.id === action.id
            ? { ...issue, priority: action.priority, updated_at: new Date().toISOString() }
            : issue,
        )
      case "delete-issue":
        return state.filter((issue) => issue.id !== action.id)
      default:
        return state
    }
  })

  // Track issue count optimistically
  const [optimisticIssueCount, setOptimisticIssueCount] = useState(initialIssueCount)

  // UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Transitions for loading states
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<number | null>(null)

  const { toast } = useToast()

  // Handle creating a new issue
  const handleCreateIssue = async (formData: FormData) => {
    setCreateError(null)

    const title = formData.get("title") as string
    const description = (formData.get("description") as string) || null
    const priority = (formData.get("priority") as "low" | "medium" | "high") || "medium"

    if (!title) {
      setCreateError("Title is required")
      return
    }

    // Create an optimistic issue with a temporary negative ID
    const tempId = -Date.now() // Use negative timestamp as temporary ID
    // Use a temporary issue number that's higher than any existing one
    const tempIssueNumber =
      optimisticIssues.length > 0 ? Math.max(...optimisticIssues.map((issue) => issue.issue_number)) + 1 : 1

    // Find the optimistic update for creating an issue and update the date handling
    const optimisticIssue: Issue = {
      id: tempId,
      issue_number: tempIssueNumber,
      title,
      description,
      status: "open",
      priority,
      created_at: new Date().toISOString(), // Ensure we use ISO string format
      updated_at: new Date().toISOString(), // Ensure we use ISO string format
      user_id: "temp-user-id", // This will be replaced by the server
    }

    // Update UI optimistically within a transition
    startTransition(() => {
      addOptimisticAction({ type: "create-issue", issue: optimisticIssue })
      setOptimisticIssueCount((prev) => prev + 1)
      setIsDialogOpen(false)
    })

    // Send request to server
    try {
      const result = await createIssue(formData)

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create issue",
        variant: "destructive",
      })
    }
  }

  // Handle updating issue status
  const handleStatusChange = (id: number, status: string) => {
    setPendingId(id)

    // Wrap both the optimistic update and the server request in startTransition
    startTransition(async () => {
      // Update UI optimistically
      addOptimisticAction({ type: "update-status", id, status })

      try {
        const result = await updateIssueStatus(id, status)
        if (result.success) {
          toast({
            title: "Success",
            description: "Issue status updated",
          })
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to update issue status",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update issue status",
          variant: "destructive",
        })
        // In a real app, we would revert the optimistic update here
      } finally {
        setPendingId(null)
      }
    })
  }

  // Handle updating issue priority
  const handlePriorityChange = (id: number, priority: string) => {
    setPendingId(id)

    // Wrap both the optimistic update and the server request in startTransition
    startTransition(async () => {
      // Update UI optimistically
      addOptimisticAction({ type: "update-priority", id, priority })

      try {
        const result = await updateIssuePriority(id, priority)
        if (result.success) {
          toast({
            title: "Success",
            description: "Issue priority updated",
          })
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to update issue priority",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update issue priority",
          variant: "destructive",
        })
        // In a real app, we would revert the optimistic update here
      } finally {
        setPendingId(null)
      }
    })
  }

  // Handle deleting an issue
  const handleDeleteIssue = (id: number) => {
    setPendingId(id)

    // Wrap both the optimistic update and the server request in startTransition
    startTransition(async () => {
      // Update UI optimistically
      addOptimisticAction({ type: "delete-issue", id })
      setOptimisticIssueCount((prev) => prev - 1)

      try {
        await deleteIssue(id)
        toast({
          title: "Success",
          description: "Issue deleted successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete issue",
          variant: "destructive",
        })
        // In a real app, we would revert the optimistic update here
      } finally {
        setPendingId(null)
      }
    })
  }

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new column and default to ascending
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Get sorted issues
  const getSortedIssues = () => {
    return [...optimisticIssues].sort((a, b) => {
      let comparison = 0

      switch (sortColumn) {
        case "issue_number":
          comparison = a.issue_number - b.issue_number
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "status":
          // Custom order: open, in_progress, closed
          const statusOrder = { open: 0, in_progress: 1, closed: 2 }
          comparison = statusOrder[a.status] - statusOrder[b.status]
          break
        case "priority":
          // Custom order: high, medium, low
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        default:
          comparison = 0
      }

      // Reverse for descending order
      return sortDirection === "asc" ? comparison : -comparison
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Circle className="h-3.5 w-3.5 text-blue-500" />
      case "in_progress":
        return <Clock className="h-3.5 w-3.5 text-amber-500" />
      case "closed":
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      default:
        return <Circle className="h-3.5 w-3.5" />
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <ArrowUpCircle className="h-3.5 w-3.5 text-red-500" />
      case "medium":
        return <ArrowUpCircle className="h-3.5 w-3.5 text-amber-500" />
      case "low":
        return <ArrowUpCircle className="h-3.5 w-3.5 text-green-500" />
      default:
        return <ArrowUpCircle className="h-3.5 w-3.5" />
    }
  }

  const formatDate = (dateString: string | null) => {
    try {
      // Make sure we have a valid date string
      if (!dateString) return "N/A"

      // Try to create a date object
      const date = new Date(dateString)

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date string:", dateString)
        return "Invalid date"
      }

      // Format the date
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date)
    } catch (error) {
      console.error("Error formatting date:", error, dateString)
      return "Invalid date"
    }
  }

  // Get sort icon for column header
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    }
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
  }

  // Get sorted issues
  const sortedIssues = getSortedIssues()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Issues</h2>
          <Badge variant="outline" className="ml-2 font-mono">
            {optimisticIssueCount} / {isPro ? "∞" : "10"}
          </Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              New Issue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Issue</DialogTitle>
              <DialogDescription>Add a new issue to track. Be descriptive to help with resolution.</DialogDescription>
            </DialogHeader>
            <form action={handleCreateIssue}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Title
                  </label>
                  <Input id="title" name="title" placeholder="Brief description of the issue" required />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">
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

      {optimisticIssues.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No issues yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first issue to start tracking your work.</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Create Issue</Button>
            </DialogTrigger>
            <DialogContent>{/* Same form content as above */}</DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th
                  className="text-left py-1.5 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[60px] cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("issue_number")}
                >
                  <div className="flex items-center">
                    ID
                    {getSortIcon("issue_number")}
                  </div>
                </th>
                <th
                  className="text-left py-1.5 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center">
                    Title
                    {getSortIcon("title")}
                  </div>
                </th>
                <th
                  className="text-left py-1.5 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[110px] cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon("status")}
                  </div>
                </th>
                <th
                  className="text-left py-1.5 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[110px] cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("priority")}
                >
                  <div className="flex items-center">
                    Priority
                    {getSortIcon("priority")}
                  </div>
                </th>
                <th
                  className="text-left py-1.5 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground w-[120px] cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center">
                    Created
                    {getSortIcon("created_at")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">#{issue.issue_number}</td>
                  <td className="py-1.5 px-3">
                    <div className="font-medium text-xs">{issue.title}</div>
                    {issue.description && (
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{issue.description}</div>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    <Select
                      value={issue.status}
                      onValueChange={(value) =>
                        handleStatusChange(issue.id, value as "open" | "in_progress" | "closed")
                      }
                      disabled={pendingId === issue.id && isPending}
                    >
                      <SelectTrigger className="h-6 w-[110px] bg-transparent border-muted text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(issue.status)}
                          <span className="capitalize">{issue.status.replace("_", " ")}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">
                          <div className="flex items-center gap-1.5">
                            <Circle className="h-3.5 w-3.5 text-blue-500" />
                            Open
                          </div>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            In Progress
                          </div>
                        </SelectItem>
                        <SelectItem value="closed">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            Closed
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-1.5 px-3">
                    <Select
                      value={issue.priority}
                      onValueChange={(value) => handlePriorityChange(issue.id, value as "low" | "medium" | "high")}
                      disabled={pendingId === issue.id && isPending}
                    >
                      <SelectTrigger className="h-6 w-[110px] bg-transparent border-muted text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getPriorityIcon(issue.priority)}
                          <span className="capitalize">{issue.priority}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-1.5">
                            <ArrowUpCircle className="h-3.5 w-3.5 text-green-500" />
                            Low
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-1.5">
                            <ArrowUpCircle className="h-3.5 w-3.5 text-amber-500" />
                            Medium
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-1.5">
                            <ArrowUpCircle className="h-3.5 w-3.5 text-red-500" />
                            High
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-1.5 px-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{formatDate(issue.created_at)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteIssue(issue.id)}
                            className="text-red-500 focus:text-red-500 text-xs"
                            disabled={pendingId === issue.id && isPending}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isPro && optimisticIssueCount >= 8 && optimisticIssueCount < 10 && (
        <Alert className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Approaching limit</AlertTitle>
          <AlertDescription>
            You're approaching your free plan limit of 10 issues. Upgrade to Pro for unlimited issues.
          </AlertDescription>
        </Alert>
      )}

      {!isPro && optimisticIssueCount >= 10 && (
        <Alert className="bg-red-500/10 text-red-500 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limit reached</AlertTitle>
          <AlertDescription>
            You've reached your free plan limit of 10 issues. Upgrade to Pro for unlimited issues.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
