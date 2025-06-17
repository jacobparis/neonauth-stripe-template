import { stackServerApp } from '@/stack'
import { db } from '@/lib/db'
import { activities, comments, todos } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function ActivitySettingsPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' })

  // Fetch latest 50 activities AND comments for the current user across all todos
  const [activityItems, commentItems] = await Promise.all([
    db.query.activities.findMany({
      where: eq(activities.userId, user.id),
      orderBy: desc(activities.createdAt),
      with: {
        todo: true,
      },
    }),
    db.query.comments.findMany({
      where: eq(comments.userId, user.id),
      orderBy: desc(comments.createdAt),
      with: {
        todo: true,
      },
    }),
  ])

  const items = [...activityItems, ...commentItems]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 50)

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" asChild size="sm">
          <Link href="/app/settings">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to settings</span>
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-semibold mb-4">Recent Activity</h1>

      {items.length === 0 && (
        <p className="text-muted-foreground">No recent activity.</p>
      )}

      <ul className="space-y-4">
        {items.map((activity) => (
          <li key={activity.id} className="text-sm">
            <Link
              href={`/app/todos/${activity.todoId}`}
              className="block rounded-md p-2 -m-2 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {activity.todo?.title || 'Todo'}
                </span>
                <span className="text-muted-foreground">—</span>
                <span className="text-muted-foreground">
                  {format(new Date(activity.createdAt), 'PPpp')}
                </span>
              </div>
              <p className="mt-1 text-foreground/90">{activity.content}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
