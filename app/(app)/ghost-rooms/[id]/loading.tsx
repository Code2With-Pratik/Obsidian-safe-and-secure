import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
        <Skeleton className="size-10 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-40 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>

      <div className="flex-1 space-y-4 overflow-hidden p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton
              className="h-10 rounded-2xl"
              style={{ width: `${45 + ((i * 11) % 40)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-border/40 p-3">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
