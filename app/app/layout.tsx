import type React from "react"
import { AppLayoutClient } from "./layout-client"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayoutClient>{children}</AppLayoutClient>
}
