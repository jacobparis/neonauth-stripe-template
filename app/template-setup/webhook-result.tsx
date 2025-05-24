'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Copy, Check } from 'lucide-react'

type WebhookResult = {
  success: boolean
  message?: string
  error?: string
  webhookId?: string
  webhookSecret?: string
  isUpdate?: boolean
}

export function WebhookResultDisplay({ result }: { result: WebhookResult }) {
  const [copied, setCopied] = useState(false)

  const copySecret = () => {
    if (
      result.webhookSecret &&
      result.webhookSecret !== 'Existing webhook secret preserved'
    ) {
      navigator.clipboard.writeText(
        `STRIPE_WEBHOOK_SECRET=${result.webhookSecret}`,
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!result || !result.success || !result.webhookSecret) return null

  return (
    <Alert className="mt-4 border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="flex items-center justify-between text-green-700">
        <code className="bg-green-100 px-2 py-1 rounded text-green-800">
          STRIPE_WEBHOOK_SECRET={result.webhookSecret}
        </code>
        <button
          onClick={copySecret}
          className="ml-2 p-1 rounded hover:bg-green-100"
          aria-label={copied ? 'Copied' : 'Copy webhook secret'}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </AlertDescription>
    </Alert>
  )
}
