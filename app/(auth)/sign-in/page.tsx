'use client'

import { LoginForm } from '@/components/login-form'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'

  const handleToggleForm = () => {
    router.push(`/sign-up${redirectUrl ? `?redirect=${redirectUrl}` : ''}`)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
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
          Neon + StackAuth Login
        </a>
        <LoginForm onToggleForm={handleToggleForm} redirectUrl={redirectUrl} />
      </div>
    </div>
  )
}
