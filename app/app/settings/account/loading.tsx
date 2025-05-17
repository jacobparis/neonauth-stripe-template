import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export default function AccountSettingsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48 mb-6" />

      {/* Email Settings */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-36" />
        </div>
        <Skeleton className="h-4 w-full max-w-md mb-4" />

        <div className="mt-4 space-y-4 max-w-md">
          {/* Email items */}
          {[1, 2].map((i) => (
            <div key={i} className="p-3 rounded-md bg-secondary/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-40" />
                  {i === 1 && <Skeleton className="h-5 w-16" />}
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-24" />
                  {i === 2 && <Skeleton className="h-8 w-8" />}
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-16" />
          </div>
        </div>
      </div>

      <Separator className="my-8 opacity-30" />

      {/* Password Settings */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-full max-w-md mb-6" />

        <div className="p-4 rounded-md bg-secondary/50 max-w-md">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>

      <Separator className="my-8 opacity-30" />

      {/* Danger Zone */}
      <div className="mt-8 max-w-md p-4 rounded-md border border-destructive/20 bg-destructive/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-3 w-48 mt-1" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  )
}
