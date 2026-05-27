import { NovaLogo } from "@/components/brand/nova-logo";

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <NovaLogo className="size-16" animated />
        <p className="text-xs text-muted-foreground tracking-widest uppercase">Loading Obsidian</p>
      </div>
    </div>
  );
}
