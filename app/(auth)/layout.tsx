import type React from "react"
import "@/app/globals.css"
import { StackProvider, StackTheme } from "@stackframe/stack"
import { stackServerApp } from "@/stack"
import { ThemeProvider } from "@/components/theme-provider"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <StackProvider app={stackServerApp}>
            <StackTheme>
              <div className="min-h-screen">{children}</div>
            </StackTheme>
          </StackProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
