import type React from 'react'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { TooltipProvider } from '@/components/ui/tooltip'

export const metadata = {
  generator: 'v0.dev',
  title: 'NeonAuth + Stripe v0 Template',
  description: 'A template for NeonAuth, Stack Auth, and Stripe integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ scrollbarGutter: 'stable' }}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
