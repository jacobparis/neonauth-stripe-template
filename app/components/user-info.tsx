"use client"

import { useUser } from "@stackframe/stack"

export function UserInfo() {
  const user = useUser()

  if (!user) {
    return <p>Not signed in</p>
  }

  return (
    <div>
      <p>Signed in as: {user.displayName || user.primaryEmail || "User"}</p>
    </div>
  )
}
