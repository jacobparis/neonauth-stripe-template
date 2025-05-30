import { Skeleton } from '@/components/ui/skeleton'

export default function TodosLoading() {
  return (
    <div className="space-y-6">
      {/* Productivity Metrics */}
      <div className="grid grid-cols-5 gap-4 mt-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      </div>

      {/* Search, Filter, and Add */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Todo list */}
      <div className="border rounded-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b">
          <div className="flex items-center gap-2 h-8">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Todo Groups */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto]">
          {/* Today's Group */}
          <div className="col-span-5 grid grid-cols-subgrid">
            <div className="col-span-5 px-2 py-2 border-t bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="grid grid-cols-subgrid col-span-5 px-2 py-1.5 gap-4"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center">
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-6" />
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming Group */}
          <div className="col-span-5 grid grid-cols-subgrid">
            <div className="col-span-5 px-2 py-2 border-t bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            {[1, 2].map((i) => (
              <div
                key={i}
                className="grid grid-cols-subgrid col-span-5 px-2 py-1.5 gap-4"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center">
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
