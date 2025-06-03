import { redis } from '@/lib/redis'
import { z } from 'zod'

export type NotificationType = 'success' | 'warning' | 'info'

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  message: z.string(),
  taskId: z.string(),
  createdAt: z.string(),
  read: z.boolean()
})
type Notification = z.infer<typeof NotificationSchema>

export type CreateNotificationInput = Omit<Notification, 'id' | 'createdAt' | 'read'>

// Helper to get the watchers key for a task
function getWatchersKey(taskId: string) {
  return `watchers:${taskId}`
}

interface WatchTaskParams {
  taskId: string
  userId: string
}

// Add a watcher to a task
export async function watchTask({ taskId, userId }: WatchTaskParams) {
  const key = getWatchersKey(taskId)
  await redis.sadd(key, userId)
}

// Remove a watcher from a task
export async function unwatchTask({ taskId, userId }: WatchTaskParams) {
  const key = getWatchersKey(taskId)
  await redis.srem(key, userId)
}

interface GetTaskWatchersParams {
  taskId: string
}

// Get all watchers for a task
export async function getTaskWatchers({ taskId }: GetTaskWatchersParams) {
  const key = getWatchersKey(taskId)
  return await redis.smembers(key)
}

interface NotifyWatchersParams {
  taskId: string
  message: string
  type?: NotificationType
}

// Notify all watchers of a task
export async function notifyWatchers({ taskId, message, type = 'info' }: NotifyWatchersParams) {
  const watchers = await getTaskWatchers({ taskId })
  
  await Promise.all(
    watchers.map(userId =>
      createNotification({
        userId,
        type,
        message,
        taskId,
      })
    )
  )
}

export async function createNotification(notification: CreateNotificationInput) {
  try {
    const now = new Date()
    const stored: Notification = {
      ...notification,
      id: `${now.getTime()}-${Math.random().toString(36).slice(2)}`,
      createdAt: now.toISOString(),
      read: false,
    }

    // Store in Redis sorted set with timestamp as score
    await redis.zadd('notifications', {
      score: now.getTime(),
      member: JSON.stringify(stored)
    })

    return stored
  } catch (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

interface MarkNotificationAsReadParams {
  userId: string
  notificationId: string
}

export async function markNotificationAsRead({ userId, notificationId }: MarkNotificationAsReadParams) {
  try {
    // Get the notification
    const results = await redis.zrange('notifications', 0, -1)
    const notification = results
      .map(r => NotificationSchema.parse(r))
      .find(n => n.id === notificationId && n.userId === userId)

    if (!notification) {
      throw new Error('Notification not found')
    }

    // Update the notification
    notification.read = true

    // Remove old version and add updated version with same score
    const timestamp = new Date(notification.createdAt).getTime()
    await redis.zremrangebyscore('notifications', timestamp, timestamp)
    await redis.zadd('notifications', {
      score: timestamp,
      member: JSON.stringify(notification)
    })

    return notification
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    throw error
  }
}

interface MarkAllNotificationsAsReadParams {
  userId: string
}

export async function markAllNotificationsAsRead({ userId }: MarkAllNotificationsAsReadParams) {
  try {
    // Get all notifications for user
    const results = await redis.zrange('notifications', 0, -1)
    const notifications = results
      .map(r => NotificationSchema.parse(r))
      .filter(n => n.userId === userId)

    // Update each notification
    await Promise.all(
      notifications.map(async notification => {
        if (!notification.read) {
          notification.read = true
          const timestamp = new Date(notification.createdAt).getTime()
          await redis.zremrangebyscore('notifications', timestamp, timestamp)
          await redis.zadd('notifications', {
            score: timestamp,
            member: JSON.stringify(notification)
          })
        }
      })
    )

    return { success: true }
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    throw error
  }
}

interface GetNotificationsSinceParams {
  userId: string
  version: number
}

export async function getNotificationsSince({ userId, version }: GetNotificationsSinceParams) {
  try {
    // Get all notifications after the version timestamp
    console.log('version', version)
    const results = await redis.zrange('notifications', version, -1, {
      rev: true,
      offset: 0,
      count: 50
    })

    console.log('results', results)
    const notifications = []
    let latestVersion = version

    for (const result of results) {
      const notification = NotificationSchema.parse(result)
      if (notification.userId === userId) {
        notifications.push(notification)
        latestVersion = Math.max(latestVersion, new Date(notification.createdAt).getTime())
      }
    }

    return {
      notifications,
      version: latestVersion
    }
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    throw error
  }
}

interface GetUnreadCountParams {
  userId: string
}

export async function getUnreadCount({ userId }: GetUnreadCountParams) {
  try {
    const results = await redis.zrange('notifications', 0, -1)
    const count = results
      .map(r => NotificationSchema.parse(r))
      .filter(n => n.userId === userId && !n.read)
      .length

    return count
  } catch (error) {
    console.error('Failed to get unread count:', error)
    return 0
  }
} 
