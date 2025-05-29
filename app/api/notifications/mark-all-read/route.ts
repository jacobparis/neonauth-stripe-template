import { NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { markAllNotificationsAsRead } from '@/app/api/notifications/notifications'

export async function POST() {
  const user = await stackServerApp.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    await markAllNotificationsAsRead({ userId: user.id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
} 
