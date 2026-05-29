import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto h-full w-full max-w-7xl overflow-hidden px-4 md:px-8 py-8 md:py-10">
      {/* badge */}
      <Skeleton className="h-7 w-52 rounded-full" />

      {/* header */}
      <div className="mt-4 flex items-start justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-12 w-64 rounded-lg" />
          <Skeleton className="h-4 w-[26rem] max-w-full rounded-md" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </div>
        <div className="flex shrink-0 gap-3">
          <Skeleton className="h-12 w-40 rounded-full" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </div>

      {/* search + share PIN */}
      <div className="mt-6 flex items-center gap-3">
        <Skeleton className="h-12 w-full max-w-md rounded-2xl" />
        <Skeleton className="h-12 w-40 rounded-2xl" />
      </div>

      {/* tabs */}
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      {/* room cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-52 flex-col justify-between rounded-3xl ring-1 ring-border/40 p-5"
          >
            <div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-6 w-2/3 rounded-md" />
              <Skeleton className="mt-2 h-3.5 w-4/5 rounded-md" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex -space-x-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="size-8 rounded-full ring-2 ring-background" />
                  ))}
                </div>
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
