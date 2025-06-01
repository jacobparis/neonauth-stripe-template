'use client'

import { useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageReasoningProps {
  isLoading: boolean
  reasoning: string
}

export function MessageReasoning({
  isLoading,
  reasoning,
}: MessageReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="flex flex-col">
      {isLoading ? (
        <div className="flex flex-row gap-2 items-center">
          <div className="text-sm">Thinking</div>
          <div className="animate-spin">
            <Loader2 className="h-4 w-4" />
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <div className="text-sm">Reasoned for a few seconds</div>
          <button
            data-testid="message-reasoning-toggle"
            type="button"
            className="cursor-pointer"
            onClick={() => {
              setIsExpanded(!isExpanded)
            }}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isExpanded ? 'rotate-180' : 'rotate-0',
              )}
            />
          </button>
        </div>
      )}

      {isExpanded && (
        <div data-testid="message-reasoning" className="pl-4 text-sm mt-2 mb-1">
          <div className="whitespace-pre-wrap">{reasoning}</div>
        </div>
      )}
    </div>
  )
}
