import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-[calc(100dvh-4rem)] w-full grid grid-cols-1 lg:grid-cols-[380px_1fr_380px] overflow-hidden bg-background/80">
      {/* left tools rail */}
      <aside className="hidden lg:flex flex-col gap-3 p-4 border-r border-border/40">
        <div className="flex items-center justify-between">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-full rounded-full" />
        <Skeleton className="h-9 w-full rounded-full" />
        <div className="grid grid-cols-3 gap-2 mt-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      </aside>

      {/* canvas */}
      <main className="grid place-items-center p-4 md:p-8">
        <Skeleton className="w-full max-w-[420px] aspect-[9/16] rounded-[40px]" />
      </main>

      {/* right inspector */}
      <aside className="hidden lg:flex flex-col gap-3 p-4 border-l border-border/40">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-28 w-full rounded-2xl mt-2" />
        <Skeleton className="h-4 w-16 mt-4" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </aside>
    </div>
  );
}
