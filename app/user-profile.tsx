"use client"

import { useStackApp } from "@stackframe/stack"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface UserProfileProps {
  user: any
  dbUser: any
}

export function UserProfile({ user, dbUser }: UserProfileProps) {
  const app = useStackApp()
  const router = useRouter()

  const handleSignOut = async () => {
    await user.signOut()
    router.refresh()
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          Your Profile
        </a>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome, {user.displayName || "User"}</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="flex flex-col items-center">
                {user.profileImageUrl && (
                  <div className="mb-4">
                    <img
                      src={user.profileImageUrl || "/placeholder.svg"}
                      alt={user.displayName || "User"}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  </div>
                )}

                <div className="grid w-full gap-4">
                  <div className="grid gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-medium">{user.primaryEmail}</p>
                  </div>

                  <div className="grid gap-1">
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="text-sm font-mono break-all">{user.id}</p>
                  </div>

                  <div className="grid gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Signed Up</p>
                    <p>{new Date(user.signedUpAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {dbUser && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Neon Auth Data</p>
                  <div className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(dbUser, null, 2)}</pre>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-4">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/settings/profile">Edit Profile</Link>
                </Button>
                <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-balance text-center text-xs text-muted-foreground">
          Built by{" "}
          <a
            href="https://x.com/jacobmparis"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            @jacobmparis
          </a>{" "}
          on v0
        </div>
      </div>
    </div>
  )
}
