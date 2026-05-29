"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useStoriesStore } from "@/store/use-stories-store";
import { cn, initials } from "@/lib/utils";

/**
 * Avatar wrapped in a story ring. The ring is drawn OUTSIDE the avatar (the
 * photo keeps its full `size`), a bright gradient that slowly rotates when the
 * reel is unwatched, or a dimmed static ring once watched. Tapping a story
 * avatar opens the "story or profile?" prompt; otherwise it falls through to
 * `onClick`.
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

  const handle = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (has) {
      e.stopPropagation();
      e.preventDefault();
      openPrompt(userId);
    } else {
      onClick?.();
    }
  };

  const interactive = has || !!onClick;
  const RING = 3.5; // gradient thickness
  const GAP = 2.5; // gap between the ring and the photo

  // Rendered as a <span> (not <button>) so it's valid even nested inside an
  // <a> (e.g. the chat-list row Link) or another button (chat header).
  return (
    <span
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? handle : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") handle(e);
            }
          : undefined
      }
      aria-label={interactive ? name : undefined}
      // overflow-visible so the negatively-inset ring can extend past the box
      // without clipping (and without shrinking the photo).
      className={cn(
        "relative inline-block shrink-0 rounded-full align-middle overflow-visible",
        interactive && "cursor-pointer",
        className
      )}
      style={{ width: size, height: size }}
    >
      {has &&
        (viewed ? (
          <span
            className="absolute rounded-full bg-foreground/25"
            style={{ inset: -(RING + GAP) }}
          />
        ) : (
          <motion.span
            className="absolute rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400"
            style={{ inset: -(RING + GAP) }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        ))}
      {/* background-colored gap ring between the gradient and the photo */}
      {has && <span className="absolute rounded-full bg-background" style={{ inset: -GAP }} />}
      {/* Explicit width/height — the Avatar primitive hardcodes h-10 w-10, which
          would otherwise override `inset-0` and pin the photo to 40px. */}
      <Avatar
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        <AvatarImage src={src} alt={name} />
        <AvatarFallback>{initials(name ?? "")}</AvatarFallback>
      </Avatar>
    </span>
  );
}
