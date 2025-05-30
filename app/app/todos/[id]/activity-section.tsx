import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { stackServerApp } from '@/stack'

export async function ActivitySection({
  todo,
}: {
  todo: {
    createdAt: Date
    updatedAt: Date
  }
}) {
  const user = await stackServerApp.getUser({ or: 'redirect' })

  return (
    <>
      <div className="flex gap-3 group">
        <div className="flex flex-col items-center">
          <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
            <AvatarImage
              src={user.profileImageUrl || undefined}
              alt={user.displayName || user.primaryEmail || ''}
            />
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
              {user.displayName?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {user.displayName || user.primaryEmail}
            </span>
            <span className="text-xs text-gray-500">
              {format(new Date(todo.createdAt), 'PPP')}
            </span>
          </div>
          <p className="text-sm text-gray-600">Created this task</p>
        </div>
      </div>
      {todo.updatedAt && (
        <div className="flex gap-3 group mt-4">
          <div className="flex flex-col items-center">
            <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
              <AvatarImage
                src={user.profileImageUrl || undefined}
                alt={user.displayName || user.primaryEmail || ''}
              />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                {user.displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {user.displayName || user.primaryEmail}
              </span>
              <span className="text-xs text-gray-500">
                {format(new Date(todo.updatedAt), 'PPP')}
              </span>
            </div>
            <p className="text-sm text-gray-600">Updated this task</p>
          </div>
        </div>
      )}
    </>
  )
}
