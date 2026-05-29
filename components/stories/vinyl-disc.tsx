"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A spinning vinyl-record cover. The rotation is driven by a
 * requestAnimationFrame loop that writes `transform` directly on the inner
 * element, so it:
 *  - runs continuously regardless of React re-renders (selecting / dragging
 *    the layer never restarts it), and
 *  - is NOT disabled by the global reduce-motion CSS rule or framer's
 *    MotionConfig — the spin is the defining visual of the "vinyl" music style,
 *    so it always animates.
 */
export function VinylDisc({
  cover,
  className
}: {
  cover?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const DURATION = 6000; // ms per full rotation
    const tick = (now: number) => {
      if (start === null) start = now;
      const deg = (((now - start) / DURATION) * 360) % 360;
      const el = ref.current;
      if (el) el.style.transform = `rotate(${deg}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={cn(
        "relative size-24 rounded-full overflow-hidden ring-2 ring-white/30 shadow-floating",
        className
      )}
    >
      <div ref={ref} className="absolute inset-0 will-change-transform">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" draggable={false} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white/15" />
        )}
      </div>
      {/* fixed center spindle */}
      <span className="absolute inset-0 m-auto size-5 rounded-full bg-black/80 ring-2 ring-white/50" />
    </div>
  );
}
