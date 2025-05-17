import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Skeleton className="h-8 w-32 mb-6" />

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48 mb-1" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36 mb-2" />
            <div className="space-y-2">
              <div className="flex items-start">
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                <Skeleton className="h-4 w-full max-w-[250px]" />
              </div>
              <div className="flex items-start">
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                <Skeleton className="h-4 w-full max-w-[280px]" />
              </div>
              <div className="flex items-start">
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                <Skeleton className="h-4 w-full max-w-[260px]" />
              </div>
              <div className="flex items-start">
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                <Skeleton className="h-4 w-full max-w-[240px]" />
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted p-3">
            <Skeleton className="h-5 w-32 mb-2" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
