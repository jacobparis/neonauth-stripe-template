import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TodoItemLoading() {
  return (
    <div>
      {/* Back button */}
      <div>
        <Button variant="ghost" asChild size="sm">
          <Link href="/app/todos">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to todos</span>
          </Link>
        </Button>
      </div>

      {/* Task Header */}
      <div className="px-6 py-8 bg-gradient-to-b from-white/95 to-white/80">
        {/* Task Title */}
        <Skeleton className="h-8 w-3/4 mb-2" />

        {/* Description */}
        <div className="mt-2">
          <Skeleton className="w-full h-[120px] rounded-xl" />
        </div>

        {/* Task Controls */}
        <div className="flex items-center justify-between mt-2 p-4 bg-white/60 rounded-none shadow-none px-0 py-0">
          <div className="flex items-center gap-6">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>

        {/* Activity Section */}
        <div className="mt-16">
          <Skeleton className="h-4 w-20 mb-6" />
          <div className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>

          {/* Add Comment */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200/40">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
