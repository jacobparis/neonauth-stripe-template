import type { Message } from 'ai'
import { useCopyToClipboard } from 'usehooks-ts'

import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { memo } from 'react'
import { toast } from 'sonner'
import { CopyIcon, PencilIcon } from 'lucide-react'

export function PureMessageActions({
  chatId,
  message,
  isLoading,
  onEdit,
}: {
  chatId: string
  message: Message
  isLoading: boolean
  onEdit?: () => void
}) {
  const [_, copyToClipboard] = useCopyToClipboard()

  if (isLoading) return null

  const textFromParts = message.parts
    ?.filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim()

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2">
        {message.role === 'user' && onEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="py-1 px-2 h-fit text-muted-foreground"
                variant="outline"
                onClick={onEdit}
              >
                <PencilIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit message</TooltipContent>
          </Tooltip>
        )}

        {textFromParts && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="py-1 px-2 h-fit text-muted-foreground"
                variant="outline"
                onClick={async () => {
                  await copyToClipboard(textFromParts)
                  toast.success('Copied to clipboard!')
                }}
              >
                <CopyIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false

    return true
  },
)
