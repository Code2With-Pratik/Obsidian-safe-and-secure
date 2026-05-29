import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* thread header */}
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-36 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="size-9 rounded-full" />
        ))}
      </div>

      {/* messages: mix of text / voice / image bubbles */}
      <div className="flex-1 space-y-4 overflow-hidden p-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-2/5 rounded-2xl" />
        </div>
        <div className="flex items-end gap-2">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <Skeleton className="h-12 w-3/5 rounded-2xl" />
        </div>
        <div className="flex items-end gap-2">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <Skeleton className="h-48 w-2/5 rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-1/2 rounded-2xl" />
        </div>
        <div className="flex items-end gap-2">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <Skeleton className="h-40 w-1/2 rounded-2xl" />
        </div>
      </div>

      {/* composer */}
      <div className="border-t border-border/40 p-3">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
