import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-full overflow-hidden">
      <Skeleton className="h-44 md:h-56 w-full rounded-none" />
      <div className="max-w-3xl mx-auto px-4 md:px-8 -mt-10 relative">
        <div className="flex items-end gap-4">
          <Skeleton className="size-24 rounded-3xl ring-4 ring-background" />
          <div className="flex-1 space-y-2 pb-2">
            <Skeleton className="h-6 w-1/2 rounded-md" />
            <Skeleton className="h-3.5 w-2/3 rounded-md" />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl ring-1 ring-border/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3 rounded-md" />
                  <Skeleton className="h-3 w-1/4 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-5/6 rounded-md" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
