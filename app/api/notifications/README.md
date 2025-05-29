# Notifications System

A Redis-based notification system for real-time task updates. Uses Redis sorted sets for notifications and Redis sets for watchers.

## Architecture

### Fan-out System

The notification system uses a fan-out on write approach, where notifications are dispatched to all watchers at the time of the event:

1. **Watcher Management**

   - Each task has a Redis Set (`watchers:{taskId}`) containing user IDs
   - O(1) membership checks for efficient watcher validation
   - O(1) add/remove operations for watch toggling

2. **Notification Storage**

   - Uses Redis Sorted Set (`notifications`) for time-based operations
   - Score: timestamp in milliseconds
   - Member: JSON stringified notification object
   - Enables efficient range queries for "notifications since X"
   - O(log N) insertion, O(log N + M) range queries where M is result size

3. **Fan-out Process**

   ```ts
   async function notifyWatchers({ taskId, message, type = 'info' }) {
     // 1. Get all watchers O(N)
     const watchers = await getTaskWatchers({ taskId })

     // 2. Fan out to each watcher O(N * log M) where M is notifications size
     await Promise.all(
       watchers.map((userId) =>
         createNotification({
           userId,
           message,
           type,
           taskId,
         }),
       ),
     )
   }
   ```

### Key Design Decisions

1. **Why Redis Sets for Watchers**

   - Fast membership checks for watch status
   - Automatic deduplication of watchers
   - Space efficient for large watcher lists

2. **Why Sorted Sets for Notifications**

   - Natural time-based ordering
   - Efficient pagination and "since" queries
   - Score (timestamp) enables version control for polling

3. **Why Fan-out on Write**
   - Immediate consistency for real-time updates
   - Simpler read path (no aggregation needed)
   - Trade-off: Higher write latency for faster reads

## Storage

- Notifications: Stored in Redis sorted set with timestamp as score
- Watchers: Stored in Redis sets (one set per task)

## Features

- Real-time notifications for task updates
- Watch/unwatch tasks
- Mark notifications as read/unread
- Notification types: success, warning, info

## Usage

### Watching Tasks

```ts
// Add a watcher
await watchTask({
  taskId,
  userId,
})

// Remove a watcher
await unwatchTask({
  taskId,
  userId,
})

// Get all watchers
const watchers = await getTaskWatchers({ taskId })
```

### Notifications

```ts
// Create a notification
await createNotification({
  userId,
  type: 'info',
  message: 'Task updated',
  taskId,
})

// Notify all watchers
await notifyWatchers({
  taskId,
  message: 'Task completed',
  type: 'success',
})
```

### Polling for Updates

```ts
// Client-side polling using version (timestamp) for efficiency
async function pollNotifications() {
  const { notifications, version } = await getNotificationsSince({
    userId,
    version: lastVersion,
  })
  lastVersion = version
  return notifications
}
```

## Where it's used

- Todo detail page (`app/todos/[id]/page-client.tsx`): Watch button
- Actions (`lib/actions.ts`): Task creation notifications
- Delete todos (`actions/delete-todos.ts`): Deletion notifications
- Toggle completed (`actions/toggle-completed.ts`): Completion notifications
- Update due date (`actions/update-due-date.ts`): Due date notifications

## UI Components

- Notifications menu (`app/components/notifications.tsx`): Global notifications dropdown
- Watch button: Appears next to task activity section

## Performance Characteristics

- Watcher operations: O(1)
- Notification creation: O(log N)
- Get notifications since: O(log N + M) where M is result size
- Fan-out: O(W \* log N) where W is watcher count and N is notification count
- Storage: O(N) for notifications, O(W) for watchers per task
