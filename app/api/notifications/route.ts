import { NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { getNotificationsSince } from './notifications'

export async function GET() {
  const user = await stackServerApp.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const { notifications } = await getNotificationsSince({ userId: user.id, version: 0 })
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json([], { status: 500 })
  }
} 
