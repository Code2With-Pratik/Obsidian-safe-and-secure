import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto h-full w-full max-w-7xl overflow-hidden px-4 md:px-8 py-8 md:py-10">
      {/* header */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-12 w-52 rounded-lg" />
          <Skeleton className="h-4 w-[26rem] max-w-full rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-12 w-48 shrink-0 rounded-full" />
      </div>

      {/* search */}
      <Skeleton className="mt-6 h-12 w-full rounded-2xl" />

      {/* filter tabs */}
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>

      {/* community cards */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-border/40"
          >
            <Skeleton className="absolute inset-0 rounded-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
            <div className="absolute left-3 top-3 h-6 w-16 rounded-full bg-black/40" />
            <div className="absolute right-3 top-3 h-7 w-14 rounded-full bg-white/80" />
            <div className="absolute inset-x-4 bottom-4 space-y-2.5">
              <div className="h-5 w-2/3 rounded-md bg-white/35" />
              <div className="h-3 w-1/4 rounded-md bg-white/25" />
              <div className="h-3 w-full rounded-md bg-white/20" />
              <div className="h-3 w-4/5 rounded-md bg-white/20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
