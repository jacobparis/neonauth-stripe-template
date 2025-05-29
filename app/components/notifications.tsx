'use client'

import { useState, useCallback } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { NotificationSchema } from '@/app/api/notifications/notifications'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

type Notification = z.infer<typeof NotificationSchema>

interface NotificationsData {
  notifications: Notification[]
  version: number
}

const STORAGE_KEY = 'notifications-data'

// Get stored data from localStorage
function getStoredData(): NotificationsData | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

// Store data to localStorage
function storeData(data: NotificationsData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to store notifications data:', error)
  }
}

// Fetcher function for SWR that handles merging with stored data
async function fetchAndMergeNotifications(
  url: string,
): Promise<NotificationsData> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch notifications')
  }

  const newData: NotificationsData = await response.json()

  // Get existing notifications from localStorage
  const stored = getStoredData()
  const existingNotifications = stored?.notifications || []

  // Merge new notifications with existing ones, avoiding duplicates
  const existingIds = new Set(existingNotifications.map((n) => n.id))
  const newNotifications = newData.notifications.filter(
    (n) => !existingIds.has(n.id),
  )

  const mergedNotifications = [...newNotifications, ...existingNotifications]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 100) // Keep only the latest 100 notifications

  const mergedData = {
    notifications: mergedNotifications,
    version: newData.version,
  }

  // Store the merged data
  if (newNotifications.length > 0) {
    storeData(mergedData)
  }

  return mergedData
}

export function NotificationsMenu() {
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()

  const [initialTimestamp] = useState(() => {
    const stored = getStoredData()
    return stored?.version || 0
  })

  // Use SWR to fetch and merge notifications
  const { data, error, mutate } = useSWR(
    `/api/notifications/since/${initialTimestamp}`,
    fetchAndMergeNotifications,
    {
      refreshInterval: 30000, // Poll every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      fallbackData: getStoredData() || undefined, // Use stored data as fallback
    },
  )

  // Derive notifications and unread count from SWR data
  const notifications = data?.notifications || []
  const unreadCount = notifications.filter((n) => !n.read).length

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (!notification.read) {
        try {
          await fetch(`/api/notifications/${notification.id}/mark-read`, {
            method: 'POST',
          })

          // Update local state optimistically
          const updatedNotifications = notifications.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n,
          )

          const updatedData = {
            notifications: updatedNotifications,
            version: data?.version || Date.now(),
          }

          // Update localStorage
          storeData(updatedData)

          // Revalidate SWR data
          mutate(updatedData, false)
        } catch (error) {
          console.error('Failed to mark notification as read:', error)
        }
      }

      // Navigate if the notification has a taskId
      if (notification.taskId) {
        router.push(`/app/todos?task=${notification.taskId}`)
      }

      setShowNotifications(false)
    },
    [notifications, data?.version, mutate, router],
  )

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })

      // Update local state optimistically
      const updatedNotifications = notifications.map((n) => ({
        ...n,
        read: true,
      }))
      const updatedData = {
        notifications: updatedNotifications,
        version: data?.version || Date.now(),
      }

      // Update localStorage
      storeData(updatedData)

      // Revalidate SWR data
      mutate(updatedData, false)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [notifications, data?.version, mutate])

  const handleClearRead = useCallback(() => {
    const unreadNotifications = notifications.filter((n) => !n.read)
    const updatedData = {
      notifications: unreadNotifications,
      version: data?.version || Date.now(),
    }

    // Update localStorage
    storeData(updatedData)

    // Update SWR data
    mutate(updatedData, false)
  }, [notifications, data?.version, mutate])

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="p-2 hover:bg-gray-100/80 transition-all duration-200 rounded-lg relative"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <Bell className="h-4 w-4 text-gray-600" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-semibold">
              {unreadCount}
            </span>
          </div>
        )}
      </Button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200/60 backdrop-blur-sm z-50">
          <div className="p-3 border-b border-gray-200/40">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 h-6"
                  >
                    Mark all read
                  </Button>
                )}
                {notifications.some((n) => n.read) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearRead}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 h-6"
                  >
                    Clear read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                  className="p-1 hover:bg-gray-100 rounded h-6 w-6"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {error
                  ? 'Failed to load notifications'
                  : data === undefined
                  ? 'Loading…'
                  : 'No notifications yet'}
              </div>
            ) : (
              notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-gray-200/20 hover:bg-gray-50/50 transition-all duration-200 cursor-pointer ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleNotificationClick(notification)
                    }
                  }}
                >
                  <div className="flex gap-2">
                    <div>
                      <p className="text-sm text-gray-900">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
