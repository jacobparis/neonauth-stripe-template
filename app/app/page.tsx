import { stackServerApp } from "@/stack"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { getStripePlan } from "@/app/api/stripe/plans"
import { Badge } from "@/components/ui/badge"

export default async function DashboardPage() {
  const user = await stackServerApp.getUser({ or: "redirect" })

  // Get the user's current plan
  const plan = await getStripePlan(user.id)
  const isPro = plan.id === "PRO"

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Welcome, {user.displayName || "User"}!</CardTitle>
            <Badge variant={isPro ? "default" : "outline"} className={isPro ? "bg-primary" : ""}>
              {isPro ? "PRO" : "FREE"}
            </Badge>
          </div>
          <CardDescription>
            <Link href="/app/settings/profile" className="text-primary hover:underline">
              View and edit your profile settings
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground/90">Available Features</h3>
            <ul className="grid gap-1.5 text-sm">
              <li className="flex items-start">
                <span className="mr-2 text-primary">•</span>
                <span>Secure authentication with password or social login</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">•</span>
                <span>Personalize your profile with custom avatar and theme</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">•</span>
                <span>Manage email addresses and security settings</span>
              </li>
              {isPro && (
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>Enhanced vibes and increased luck with PRO plan</span>
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-md bg-muted p-3">
            <h3 className="text-sm font-medium mb-2">User Information</h3>
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{user.displayName || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user.primaryEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{new Date(user.signedUpAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{isPro ? "PRO" : "FREE"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
