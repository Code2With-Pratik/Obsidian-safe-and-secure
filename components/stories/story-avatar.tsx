"use client";

import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useStoriesStore } from "@/store/use-stories-store";
import { cn, initials } from "@/lib/utils";

/**
 * Avatar wrapped in a story ring. When the user has an active reel the ring is
 * a bright gradient (unwatched) or dimmed (watched). Tapping a story avatar
 * opens the "story or profile?" prompt; otherwise it falls through to `onClick`.
 *
 * Sized in px so the ring + gap layer cleanly regardless of where it's dropped.
 */
export function StoryAvatar({
  userId,
  src,
  name,
  size = 40,
  onClick,
  className
}: {
  userId: string;
  src?: string;
  name?: string;
  size?: number;
  /** Fallback click when the user has NO story (e.g. open chat / profile). */
  onClick?: () => void;
  className?: string;
}) {
  const entry = useStoriesStore((s) => s.byUser[userId]);
  const openPrompt = useStoriesStore((s) => s.openPrompt);
  const has = !!entry?.slides.length;
  const viewed = entry?.viewed;

  const handle = (e: React.MouseEvent) => {
    if (has) {
      e.stopPropagation();
      e.preventDefault();
      openPrompt(userId);
    } else {
      onClick?.();
    }
  };

  const interactive = has || !!onClick;
  const pad = has ? 4 : 0; // ring(2) + gap(2)

  const inner = (
    <>
      {has && (
        <span
          className={cn(
            "absolute inset-0 rounded-full",
            viewed
              ? "bg-foreground/25"
              : "bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400"
          )}
        />
      )}
      {has && <span className="absolute rounded-full bg-background" style={{ inset: 2 }} />}
      <Avatar className="absolute overflow-hidden rounded-full" style={{ inset: pad }}>
        <AvatarImage src={src} alt={name} />
        <AvatarFallback>{initials(name ?? "")}</AvatarFallback>
      </Avatar>
    </>
  );

  if (!interactive) {
    return (
      <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={name}
      className={cn("relative inline-block shrink-0 rounded-full", className)}
      style={{ width: size, height: size }}
    >
      {inner}
    </button>
  );
}
