import type React from "react"
import "./globals.css"
import { StackProvider, StackTheme } from "@stackframe/stack"
import { stackServerApp } from "@/stack"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <StackProvider app={stackServerApp}>
            <StackTheme>{children}</StackTheme>
          </StackProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
