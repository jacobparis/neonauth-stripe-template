import { NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { getUnreadCount } from '@/app/api/notifications/notifications'

export async function GET() {
  const user = await stackServerApp.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const count = await getUnreadCount({ userId: user.id })
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Failed to fetch unread count:', error)
    return NextResponse.json({ count: 0 }, { status: 500 })
  }
} 
