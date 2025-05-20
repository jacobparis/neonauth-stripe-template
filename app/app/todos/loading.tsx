import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-6 w-16 rounded-full ml-2" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted/50 p-3 border-b">
            <div className="grid grid-cols-5 gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-8 ml-auto" />
            </div>
          </div>
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4">
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full max-w-[200px]" />
                    <Skeleton className="h-4 w-full max-w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-[130px]" />
                  <Skeleton className="h-8 w-[130px]" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-8 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
