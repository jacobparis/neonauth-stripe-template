import { NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { getNotificationsSince } from '@/app/api/notifications/notifications'
import { PageProps } from '@/lib/utils'

export async function GET(
  request: Request,
  { params }: PageProps
) {
  const user = await stackServerApp.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const clientVersion = Number((await params).version)

  try {
    const { notifications, version } = await getNotificationsSince({ userId: user.id, version: clientVersion })
    return NextResponse.json({ notifications, version })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
} 
