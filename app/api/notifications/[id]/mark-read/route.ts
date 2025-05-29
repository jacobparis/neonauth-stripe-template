import { NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { markNotificationAsRead } from '@/app/api/notifications/notifications'
import { PageProps } from '@/lib/utils'

export async function POST(
  request: Request,
  { params }: PageProps
) {
  const user = await stackServerApp.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { id } = await params
  if (!id || typeof id !== 'string') {
    return new NextResponse('Bad Request', { status: 400 })
  }

  try {
    await markNotificationAsRead({ notificationId: id, userId: user.id})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
} 
