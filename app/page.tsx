import { CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DevChecklistPage } from './template-setup/dev-checklist'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Page() {
  return (
    <div className="container mx-auto max-w-3xl py-8">
      {/* Hero Section */}
      <section className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="secondary" className="mb-6">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            Production Ready
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            NeonAuth + Stripe
            <br />
            <span className="text-muted-foreground">v0 Template</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Users can log in and pay to unlock premium features.
            <br />
            Give your idea to v0, turn this into your own product, and start
            collecting payments.
          </p>

          <Button className="mt-4" asChild>
            <Link href="/app">Open app</Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            This may not work until the below steps are complete.
          </p>
        </div>
      </section>

      {/* Delete this when you're done setting up your project */}
      <DevChecklistPage />

      <footer className="mt-20 border-t pt-8 pb-16 text-center">
        <p className="text-sm text-muted-foreground font-mono">
          Engineered by{' '}
          <a
            href="https://x.com/jacobmparis"
            target="_blank"
            className="text-foreground hover:underline"
          >
            Jacob Paris
          </a>{' '}
          in cooperation with{' '}
          <a
            href="https://neon.tech"
            target="_blank"
            className="font-medium tracking-tight bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent hover:underline"
          >
            Neon
          </a>
        </p>
      </footer>
    </div>
  )
}
