import type React from "react"
import { AppLayoutClient } from "./layout-client"
import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayoutClient>{children}</AppLayoutClient>
}
