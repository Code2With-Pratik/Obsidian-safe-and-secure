import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-full w-full px-4 pt-4 overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <div className="flex gap-2">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>

      <div className="mb-5 flex gap-2.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="shrink-0 w-[88px] h-[112px] rounded-[26px]" />
        ))}
      </div>

      <div className="space-y-3.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3 rounded-md" />
              <Skeleton className="h-3 w-2/3 rounded-md" />
            </div>
            <Skeleton className="h-3 w-10 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
