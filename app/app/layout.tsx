import type React from "react"
import { AppLayoutClient } from "./layout-client"
import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await stackServerApp.getUser()
  if (!user) {
    redirect("/sign-in")
  }

  return <AppLayoutClient>{children}</AppLayoutClient>
}
