import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto h-full w-full max-w-7xl overflow-hidden px-4 md:px-8 py-8 md:py-10">
      {/* title */}
      <Skeleton className="h-11 w-72 rounded-lg" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-[28rem] max-w-full rounded-md" />
        <Skeleton className="h-4 w-56 rounded-md" />
      </div>

      {/* action cards */}
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-6 rounded-2xl ring-1 ring-border/40 p-4">
            <Skeleton className="size-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
          </div>
        ))}
        {/* Total call time + stat pills */}
        <div className="flex items-center justify-between gap-4 rounded-2xl ring-1 ring-border/40 p-4">
          <div className="space-y-6">
            <Skeleton className="size-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-12 w-24 rounded-xl" />
            <Skeleton className="h-12 w-24 rounded-xl" />
          </div>
        </div>
      </div>

      {/* recent calls + upcoming */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl ring-1 ring-border/40 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-full" />
            ))}
          </div>
          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3 rounded-md" />
                  <Skeleton className="h-3 w-1/4 rounded-md" />
                </div>
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="size-9 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl ring-1 ring-border/40 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="mt-16 flex flex-col items-center gap-3">
            <Skeleton className="size-12 rounded-2xl" />
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-3 w-52 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
