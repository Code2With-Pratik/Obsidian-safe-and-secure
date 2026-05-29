"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useStoriesStore } from "@/store/use-stories-store";
import { currentUser } from "@/lib/mock-data";
import { useT } from "@/lib/i18n";

/**
 * Story "upload" progress bar, shown in the chat-list header between the title
 * and the filter tabs. The width is driven by requestAnimationFrame (so it
 * animates even under the global reduce-motion setting). When the bar fills AND
 * the composed slide has arrived, the story is committed to the reel, a green
 * tick flashes, then the whole bar vanishes.
 */
export function StoryUploadBar() {
  const t = useT();
  const pending = useStoriesStore((s) => s.pendingStory);
  const addStory = useStoriesStore((s) => s.addStory);
  const clearPending = useStoriesStore((s) => s.clearPendingStory);
  const [progress, setProgress] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const committed = React.useRef(false);

  const active = !!pending;
  const userId = pending?.userId;

  // Fill the bar over ~1.6s once an upload starts. Keyed on userId so attaching
  // the composed slide mid-flight doesn't restart it.
  React.useEffect(() => {
    if (!active) {
      setProgress(0);
      setDone(false);
      committed.current = false;
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const DURATION = 1600;
    const tick = (now: number) => {
      if (start === null) start = now;
      const pct = Math.min(100, ((now - start) / DURATION) * 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, userId]);

  // Commit once the bar is full and the composed slide has arrived, then flash
  // the tick and disappear.
  React.useEffect(() => {
    if (!pending || committed.current) return;
    if (progress >= 100 && pending.slide) {
      committed.current = true;
      addStory(pending.userId, pending.slide);
      setDone(true);
      const tmo = window.setTimeout(() => clearPending(), 650);
      return () => window.clearTimeout(tmo);
    }
  }, [progress, pending, addStory, clearPending]);

  if (!pending) return null;

  return (
    <div className="px-4 mt-3">
      <div className="flex items-center gap-2.5 glass-subtle rounded-full pl-1.5 pr-3 py-1.5 border border-border/40">
        <Avatar className="size-7 shrink-0 ring-1 ring-border/50">
          <AvatarImage src={currentUser.avatar} />
        </Avatar>
        <span className="text-xs font-medium text-foreground shrink-0">
          {done ? t("Shared") : t("Uploading story…")}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
            style={{ width: `${progress}%` }}
          />
        </div>
        {done && (
          <span className="size-5 rounded-full bg-emerald-500 grid place-items-center shrink-0">
            <Check className="size-3 text-white" strokeWidth={3} />
          </span>
        )}
      </div>
    </div>
  );
}
