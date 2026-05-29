import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-full overflow-hidden px-4 md:px-8 py-6 md:py-10">
      <div className="flex gap-8">
        {/* left nav */}
        <div className="w-56 shrink-0 space-y-5">
          <Skeleton className="h-3.5 w-16 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-3.5 w-40 rounded-md" />
          </div>
          <div className="space-y-1.5 pt-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2.5">
                <Skeleton className="size-5 shrink-0 rounded-md" />
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-5 w-20 rounded-md" />
        </div>

        {/* right content (centered in the remaining space) */}
        <div className="mx-auto w-full max-w-2xl">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-56 rounded-md" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 rounded-2xl ring-1 ring-border/30 p-4"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-48 rounded-md" />
                </div>
                <Skeleton className="h-9 w-40 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
