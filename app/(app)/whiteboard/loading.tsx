import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="relative h-full w-full overflow-hidden p-4">
      {/* top toolbar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-44 rounded-2xl" />
        <Skeleton className="h-10 w-32 rounded-2xl" />
      </div>

      {/* canvas with floating cards */}
      <div className="relative mt-4 h-[calc(100%-3.5rem)] rounded-3xl ring-1 ring-border/30 overflow-hidden">
        <Skeleton className="absolute left-[12%] top-[18%] h-28 w-44 rounded-2xl" />
        <Skeleton className="absolute left-[44%] top-[30%] h-32 w-52 rounded-2xl" />
        <Skeleton className="absolute left-[68%] top-[14%] h-24 w-40 rounded-2xl" />
        <Skeleton className="absolute left-[28%] top-[58%] h-36 w-48 rounded-2xl" />
        <Skeleton className="absolute left-[60%] top-[62%] h-28 w-44 rounded-2xl" />

        {/* floating tool dock */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="size-11 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
