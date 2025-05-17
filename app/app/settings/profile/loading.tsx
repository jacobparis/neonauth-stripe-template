import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export default function ProfileSettingsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48 mb-6" />

      {/* Profile Settings */}
      <section className="relative flex items-center gap-4">
        <div>
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-background">
            <Skeleton className="h-full w-full" />
          </div>
        </div>

        <div className="flex-1 max-w-md">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full mb-1" />
          <div className="flex justify-end">
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
      </section>

      <Separator className="my-8 opacity-30" />

      {/* Appearance Settings */}
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="flex gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  )
}
