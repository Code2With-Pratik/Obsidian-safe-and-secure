import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto h-full w-full max-w-7xl overflow-hidden px-4 md:px-8 py-8 md:py-10">
      {/* header: title + storage meter */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-11 w-60 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="hidden w-56 flex-col items-end gap-2 sm:flex">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="mt-1 h-1.5 w-full rounded-full" />
        </div>
      </div>

      {/* drag & drop zone */}
      <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border/50 py-12">
        <Skeleton className="size-16 rounded-2xl" />
        <Skeleton className="h-6 w-52 rounded-md" />
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-3.5 w-80 max-w-[80vw] rounded-md" />
          <Skeleton className="h-3.5 w-40 rounded-md" />
        </div>
        <div className="mt-1 flex gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </div>

      {/* search + view toggle */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Skeleton className="h-11 w-full max-w-md rounded-full" />
        <div className="flex gap-1.5">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </div>

      {/* filter tabs */}
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      {/* breadcrumb */}
      <Skeleton className="mt-5 h-4 w-24 rounded-md" />

      {/* folder / file grid */}
      <div className="mt-5 grid grid-cols-3 gap-5 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2.5">
            <Skeleton className="h-16 w-20 rounded-xl" />
            <Skeleton className="h-3.5 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
