import { stackServerApp } from "@/stack"
import { getStripePlan } from "@/app/api/stripe/plans"
import { Badge } from "@/components/ui/badge"
import { IssueTracker } from "@/app/components/issue-tracker"
import { getIssues, getIssueCount } from "@/actions/get-issues"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { PageArgs } from "@/lib/utils"

export default async function DashboardPage({ searchParams }: PageArgs) {
  const user = await stackServerApp.getUser({ or: "redirect" })

  // Get the user's current plan
  const plan = await getStripePlan(user.id)
  const isPro = plan.id === "PRO"

  // Get issues for the user with error handling
  let issues = await getIssues()
  let issueCount = await getIssueCount()
  let error = null

  // Get the current view from search params
  const { view = "all" } = await searchParams

  // Filter issues based on the view
  const filteredIssues = issues.filter((issue) => {
    if (view === "active") {
      return issue.status === "open" || issue.status === "in_progress"
    } else if (view === "backlog") {
      return issue.priority === "low" && issue.status !== "closed"
    }
    return true // "all" view shows everything
  })

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">
            {view === "all"
              ? "All Issues"
              : view === "active"
              ? "Active Issues"
              : "Backlog Issues"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Welcome back, {user.displayName || "User"}. You're on the{" "}
            {isPro ? "Pro" : "Free"} plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPro ? (
            <Badge className="bg-primary text-primary-foreground text-xs">
              PRO
            </Badge>
          ) : (
            <Button variant="outline" size="sm" asChild className="h-7 text-xs">
              <a href="/app/settings/account">Upgrade to Pro</a>
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <IssueTracker
            initialIssues={filteredIssues}
            isPro={isPro}
            issueCount={issueCount}
          />
        </div>
      )}
    </div>
  )
}
