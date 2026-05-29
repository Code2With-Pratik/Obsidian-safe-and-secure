import { NovaMascot } from "@/components/nova-mascot";

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <NovaMascot size={80} />
        <p className="text-xs text-muted-foreground tracking-widest uppercase">Loading Obsidian</p>
      </div>
    </div>
  );
}
