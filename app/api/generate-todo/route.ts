import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { generateTodoFromUserMessage } from '@/lib/actions'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
