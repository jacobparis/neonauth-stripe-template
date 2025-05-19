"use client"

import { useState, useTransition } from "react"
import { createIssue } from "@/actions/create-issue"
import {
  updateIssueStatus,
  bulkUpdateStatus,
} from "@/actions/update-issue-status"
import {
  updateIssuePriority,
  bulkUpdatePriority,
} from "@/actions/update-issue-priority"
import { deleteIssue, bulkDeleteIssues } from "@/actions/delete-issues"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  X,
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
  | { type: "bulk-update-status"; ids: number[]; status: string }
  | { type: "bulk-update-priority"; ids: number[]; priority: string }
  | { type: "bulk-delete"; ids: number[] }

// Define sort columns and directions
type SortColumn =
  | "issue_number"
  | "title"
  | "status"
  | "priority"
  | "created_at"
type SortDirection = "asc" | "desc"

export function IssueTracker({
  initialIssues,
  isPro,
  issueCount: initialIssueCount,
}: IssueTrackerProps) {
  // Replace optimistic state with regular state
  const [issues, setIssues] = useState(initialIssues)
  const [issueCount, setIssueCount] = useState(initialIssueCount)

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>("issue_number")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Bulk selection state
  const [selectedIssueIds, setSelectedIssueIds] = useState<number[]>([])
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)

  // UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Transitions for loading states
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [bulkActionPending, setBulkActionPending] = useState(false)

  const { toast } = useToast()

  // Update issues helper
  const updateIssuesState = (action: {
    type: "create" | "update" | "delete" | "bulk-update" | "bulk-delete"
    payload: any
  }) => {
    switch (action.type) {
      case "create":
        setIssues((prev) => [...prev, action.payload.issue])
        setIssueCount((prev) => prev + 1)
        break
      case "update":
        setIssues((prev) =>
          prev.map((issue) =>
            issue.id === action.payload.id
              ? { ...issue, ...action.payload.changes }
              : issue,
          ),
        )
        break
      case "delete":
        setIssues((prev) =>
          prev.filter((issue) => issue.id !== action.payload.id),
        )
        setIssueCount((prev) => prev - 1)
        break
      case "bulk-update":
        setIssues((prev) =>
          prev.map((issue) =>
            action.payload.ids.includes(issue.id)
              ? { ...issue, ...action.payload.changes }
              : issue,
          ),
        )
        break
      case "bulk-delete":
        setIssues((prev) =>
          prev.filter((issue) => !action.payload.ids.includes(issue.id)),
        )
        setIssueCount((prev) => prev - action.payload.ids.length)
        break
    }
  }

  // Handle bulk status update
  const handleBulkStatusChange = (status: string) => {
    if (selectedIssueIds.length === 0) return

    setBulkActionPending(true)

    // Update state immediately
    updateIssuesState({
      type: "bulk-update",
      payload: {
        ids: selectedIssueIds,
        changes: {
          status,
          updated_at: new Date(),
        },
      },
    })

    // Make server request
    startTransition(async () => {
      try {
        const result = await bulkUpdateStatus(selectedIssueIds, status)

        if (result.success) {
          toast({
            title: "Success",
            description:
              result.message ||
              `Updated ${selectedIssueIds.length} issues to ${status.replace(
                "_",
                " ",
              )}`,
          })
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to update issues",
            variant: "destructive",
          })
        }

        clearSelection()
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update issues",
          variant: "destructive",
        })
      } finally {
        setBulkActionPending(false)
      }
    })
  }

  // Handle bulk priority update
  const handleBulkPriorityChange = (priority: string) => {
    if (selectedIssueIds.length === 0) return

    setBulkActionPending(true)

    // Update state immediately
    updateIssuesState({
      type: "bulk-update",
      payload: {
        ids: selectedIssueIds,
        changes: {
          priority,
          updated_at: new Date(),
        },
      },
    })

    // Make server request
    startTransition(async () => {
      try {
        const result = await bulkUpdatePriority(selectedIssueIds, priority)

        if (result.success) {
          toast({
            title: "Success",
            description:
              result.message ||
              `Updated ${selectedIssueIds.length} issues to ${priority} priority`,
          })
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to update issues",
            variant: "destructive",
          })
        }

        clearSelection()
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update issues",
          variant: "destructive",
        })
      } finally {
        setBulkActionPending(false)
      }
    })
  }

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedIssueIds.length === 0) return

    setBulkActionPending(true)
    setIsConfirmDeleteOpen(false)

    // Update state immediately
    updateIssuesState({
      type: "bulk-delete",
      payload: {
        ids: selectedIssueIds,
      },
    })

    // Make server request
    startTransition(async () => {
      try {
        const result = await bulkDeleteIssues(selectedIssueIds)

        if (result.success) {
          toast({
            title: "Success",
            description:
              result.message || `Deleted ${selectedIssueIds.length} issues`,
          })
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to delete issues",
            variant: "destructive",
          })
        }

        clearSelection()
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete issues",
          variant: "destructive",
        })
      } finally {
        setBulkActionPending(false)
      }
    })
  }

  // Handle single issue operations similarly
  const handleStatusChange = (id: number, status: string) => {
    setPendingId(id)

    // Update state immediately
    updateIssuesState({
      type: "update",
      payload: {
        id,
        changes: {
          status,
          updated_at: new Date(),
        },
      },
    })

    startTransition(async () => {
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
      } finally {
        setPendingId(null)
      }
    })
  }

  const handlePriorityChange = (id: number, priority: string) => {
    setPendingId(id)

    // Update state immediately
    updateIssuesState({
      type: "update",
      payload: {
        id,
        changes: {
          priority,
          updated_at: new Date(),
        },
      },
    })

    startTransition(async () => {
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
      } finally {
        setPendingId(null)
      }
    })
  }

  const handleDeleteIssue = (id: number) => {
    setPendingId(id)

    // Update state immediately
    updateIssuesState({
      type: "delete",
      payload: { id },
    })

    startTransition(async () => {
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
      } finally {
        setPendingId(null)
      }
    })
  }

  // Toggle single issue selection
  const toggleIssueSelection = (id: number) => {
    setSelectedIssueIds((prev) =>
      prev.includes(id)
        ? prev.filter((issueId) => issueId !== id)
        : [...prev, id],
    )
  }

  // Toggle all issues selection
  const toggleSelectAll = () => {
    if (selectedIssueIds.length === issues.length) {
      // If all are selected, deselect all
      setSelectedIssueIds([])
    } else {
      // Otherwise, select all
      setSelectedIssueIds(issues.map((issue) => issue.id))
    }
  }

  // Clear all selections
  const clearSelection = () => {
    setSelectedIssueIds([])
  }

  // Handle creating a new issue
  const handleCreateIssue = async (formData: FormData) => {
    setCreateError(null)

    const title = formData.get("title") as string
    const description = (formData.get("description") as string) || null
    const priority =
      (formData.get("priority") as "low" | "medium" | "high") || "medium"

    if (!title) {
      setCreateError("Title is required")
      return
    }

    // Create a temporary issue
    const tempId = -Date.now()
    const tempIssueNumber =
      issues.length > 0
        ? Math.max(...issues.map((issue) => issue.issue_number)) + 1
        : 1

    const newIssue: Issue = {
      id: tempId,
      issue_number: tempIssueNumber,
      title,
      description,
      status: "open",
      priority,
      created_at: new Date(),
      updated_at: new Date(),
      user_id: "temp-user-id",
    }

    // Update state immediately
    updateIssuesState({
      type: "create",
      payload: { issue: newIssue },
    })
    setIsDialogOpen(false)

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
    return [...issues].sort((a, b) => {
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
          const statusOrder: Record<string, number> = {
            open: 0,
            in_progress: 1,
            closed: 2,
          }
          comparison =
            statusOrder[a.status as keyof typeof statusOrder] -
            statusOrder[b.status as keyof typeof statusOrder]
          break
        case "priority":
          // Custom order: high, medium, low
          const priorityOrder: Record<string, number> = {
            high: 0,
            medium: 1,
            low: 2,
          }
          comparison =
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder]
          break
        case "created_at":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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

  const formatDate = (dateString: string | Date | null) => {
    try {
      // Make sure we have a valid date string or object
      if (!dateString) return "N/A"

      // Try to create a date object
      const date =
        dateString instanceof Date ? dateString : new Date(dateString)

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString)
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
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    )
  }

  // Get sorted issues
  const sortedIssues = getSortedIssues()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        {selectedIssueIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {selectedIssueIds.length} selected
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs bg-transparent border-muted"
                >
                  Status
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-xs">
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange("open")}
                >
                  <Circle className="mr-2 h-3.5 w-3.5 text-blue-500" />
                  Mark as Open
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange("in_progress")}
                >
                  <Clock className="mr-2 h-3.5 w-3.5 text-amber-500" />
                  Mark as In Progress
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange("closed")}
                >
                  <CheckCircle className="mr-2 h-3.5 w-3.5 text-green-500" />
                  Mark as Closed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs bg-transparent border-muted"
                >
                  Priority
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-xs">
                <DropdownMenuItem
                  onClick={() => handleBulkPriorityChange("low")}
                >
                  <ArrowUpCircle className="mr-2 h-3.5 w-3.5 text-green-500" />
                  Set Low
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkPriorityChange("medium")}
                >
                  <ArrowUpCircle className="mr-2 h-3.5 w-3.5 text-amber-500" />
                  Set Medium
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkPriorityChange("high")}
                >
                  <ArrowUpCircle className="mr-2 h-3.5 w-3.5 text-red-500" />
                  Set High
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-xs">
                <DropdownMenuItem
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              disabled={bulkActionPending}
              className="h-6 p-1 text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Issues</h2>
            <Badge variant="outline" className="ml-2 font-mono">
              {issueCount} / {isPro ? "∞" : "10"}
            </Badge>
          </div>
        )}
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

      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No issues yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first issue to start tracking your work.
          </p>
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
                <th className="w-10 px-3 py-1.5">
                  <Checkbox
                    checked={
                      issues.length > 0 &&
                      selectedIssueIds.length === issues.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all issues"
                  />
                </th>
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
                <tr
                  key={issue.id}
                  className={`hover:bg-muted/30 transition-colors ${
                    selectedIssueIds.includes(issue.id) ? "bg-muted/50" : ""
                  }`}
                >
                  <td className="px-3 py-1.5">
                    <Checkbox
                      checked={selectedIssueIds.includes(issue.id)}
                      onCheckedChange={() => toggleIssueSelection(issue.id)}
                      aria-label={`Select issue #${issue.issue_number}`}
                    />
                  </td>
                  <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">
                    #{issue.issue_number}
                  </td>
                  <td className="py-1.5 px-3">
                    <div className="font-medium text-xs">{issue.title}</div>
                    {issue.description && (
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {issue.description}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    <Select
                      value={issue.status}
                      onValueChange={(value) =>
                        handleStatusChange(
                          issue.id,
                          value as "open" | "in_progress" | "closed",
                        )
                      }
                      disabled={pendingId === issue.id && isPending}
                    >
                      <SelectTrigger className="h-6 w-[110px] bg-transparent border-muted text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(issue.status)}
                          <span className="capitalize">
                            {issue.status.replace("_", " ")}
                          </span>
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
                      onValueChange={(value) =>
                        handlePriorityChange(
                          issue.id,
                          value as "low" | "medium" | "high",
                        )
                      }
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
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(issue.created_at)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-2"
                          >
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

      {/* Confirmation Dialog for Bulk Delete */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIssueIds.length} issues?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkActionPending}
            >
              {bulkActionPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isPro && issueCount >= 8 && issueCount < 10 && (
        <Alert className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Approaching limit</AlertTitle>
          <AlertDescription>
            You're approaching your free plan limit of 10 issues. Upgrade to Pro
            for unlimited issues.
          </AlertDescription>
        </Alert>
      )}

      {!isPro && issueCount >= 10 && (
        <Alert className="bg-red-500/10 text-red-500 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limit reached</AlertTitle>
          <AlertDescription>
            You've reached your free plan limit of 10 issues. Upgrade to Pro for
            unlimited issues.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
