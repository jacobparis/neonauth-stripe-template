import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { generateTodoFromUserMessage } from '@/lib/actions'
import { checkMessageRateLimit } from '@/lib/rate-limit'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit for AI todo generation (counts as 1 message)
    const { success, remaining, reset } = await checkMessageRateLimit(user.id)
    if (!success) {
      return NextResponse.json({ 
        error: `Rate limit exceeded. You have ${remaining} messages remaining today. Resets in ${Math.ceil((reset - Date.now()) / (1000 * 60 * 60))} hours.`
      }, { status: 429 })
    }

    const result = await generateTodoFromUserMessage({
      prompt,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate todo error:', error)
    return NextResponse.json({ error: 'Failed to generate todo' }, { status: 500 })
  }
} 
