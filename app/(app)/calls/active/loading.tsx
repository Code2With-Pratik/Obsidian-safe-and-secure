import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-black/40 p-4">
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-full min-h-40 w-full rounded-3xl" />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-14 rounded-full" />
        ))}
      </div>
    </div>
  );
}
