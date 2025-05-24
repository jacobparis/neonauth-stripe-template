'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Webhook, AlertTriangle } from 'lucide-react'
import { registerStripeWebhook } from './actions'
import { WebhookResultDisplay } from './webhook-result'

type WebhookResult = {
  success: boolean
  message?: string
  error?: string
  webhookId?: string
  webhookSecret?: string
  isUpdate?: boolean
}

export function StripeWebhookForm({
  canRegister,
  webhookSecretExists,
}: {
  canRegister: boolean
  webhookSecretExists: boolean
}) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [result, setResult] = useState<WebhookResult | null>(null)

  async function handleRegisterWebhook() {
    setIsRegistering(true)
    setResult(null)

    try {
      await registerStripeWebhook()
      setResult({
        success: true,
        message: 'Webhook registered successfully!',
      })
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      })
    } finally {
      setIsRegistering(false)
    }
  }

  if (webhookSecretExists) {
    return null
  }

  return (
    <div>
      {canRegister ? (
        <div className="mt-4">
          <Button
            onClick={handleRegisterWebhook}
            disabled={isRegistering}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Webhook className="h-4 w-4 mr-2" />
            {isRegistering ? 'Registering...' : 'Register Stripe Webhook'}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex items-center text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4 mr-1" />
          <span>
            STRIPE_SECRET_KEY and VERCEL_URL required to register webhook
          </span>
        </div>
      )}

      {result && <WebhookResultDisplay result={result} />}
    </div>
  )
}
