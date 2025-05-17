import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="container mx-auto py-8 px-4 flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 shrink-0">
        <Skeleton className="h-7 w-32 mb-4" />
        <nav className="space-y-1">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </nav>
      </aside>
      <main className="flex-1 max-w-3xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-[400px] w-full rounded-md" />
      </main>
    </div>
  )
}
