"use client";

import * as React from "react";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";
import type { RemoteCursor } from "./use-whiteboard-presence";

interface Props {
  cursors: RemoteCursor[];
}

/**
 * Renders every OTHER user's cursor over the board canvas. Coordinates
 * come in as board-space (x, y) — we convert to screen-space using the
 * active board's camera so cursors follow pan + zoom correctly.
 *
 * Each cursor is drawn as a colored Figma-style pointer + a name pill
 * underneath. Idle cursors (no movement in 6s) fade out.
 */
export function RemoteCursorsLayer({ cursors }: Props) {
  const camera = useWhiteboardStore((s) => s.activeBoard()?.camera);
  if (!camera) return null;
  const now = Date.now();
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {cursors.map((c) => {
        // Hide the initial "hello" cursor at (-9999, -9999) until the
        // user actually moves.
        if (c.x < -9000 || c.y < -9000) return null;
        const screenX = c.x * camera.zoom + camera.x;
        const screenY = c.y * camera.zoom + camera.y;
        const idleMs = now - c.updatedAt;
        const opacity = idleMs < 6000 ? 1 : Math.max(0, 1 - (idleMs - 6000) / 4000);
        return (
          <div
            key={c.userId}
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
              opacity
            }}
            // GPU-friendly transform + a CSS transition so the cursor
            // glides between presence frames instead of teleporting.
            className="absolute top-0 left-0 transition-transform duration-100 ease-linear will-change-transform"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill={c.color}>
              <path
                d="M4 1l13 9-6 1-3 6-4-16z"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="0.5"
              />
            </svg>
            <div
              className="absolute left-4 top-4 text-[10px] font-semibold text-white px-1.5 py-0.5 rounded shadow whitespace-nowrap"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
