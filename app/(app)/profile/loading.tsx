import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-full overflow-hidden">
      <Skeleton className="h-56 md:h-72 w-full rounded-none" />
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-16 md:-mt-20 relative">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <Skeleton className="size-28 md:size-36 rounded-full ring-4 ring-background" />
          <div className="flex-1 space-y-3 pb-2">
            <Skeleton className="h-7 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
            <Skeleton className="h-3.5 w-40 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-2xl" />
            <Skeleton className="size-10 rounded-2xl" />
            <Skeleton className="size-10 rounded-2xl" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
