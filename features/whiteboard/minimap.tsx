"use client";

import * as React from "react";
import { animate } from "framer-motion";
import { useWhiteboardStore, type Element } from "@/store/use-whiteboard-store";

const MAP_W = 200;
const MAP_H = 140;

/** Returns the smallest rect containing every element. Falls back to a
 *  default viewport-sized box when the board is empty. */
function computeContentBounds(elements: Element[]) {
  if (elements.length === 0) {
    return { x: 0, y: 0, w: 1200, h: 800 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    if (el.kind === "path") {
      for (let i = 0; i < el.points.length; i += 2) {
        const x = el.points[i];
        const y = el.points[i + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    } else if (el.kind === "line") {
      const xs = [el.x, el.x2];
      const ys = [el.y, el.y2];
      for (const v of xs) {
        if (v < minX) minX = v;
        if (v > maxX) maxX = v;
      }
      for (const v of ys) {
        if (v < minY) minY = v;
        if (v > maxY) maxY = v;
      }
    } else if (el.kind === "connection") {
      // Connections derive their bounds from their endpoint notes; skip here
      // (the notes themselves will have already been counted).
      continue;
    } else {
      const w = (el as { w?: number }).w ?? 100;
      const h = (el as { h?: number }).h ?? 30;
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if (el.x + w > maxX) maxX = el.x + w;
      if (el.y + h > maxY) maxY = el.y + h;
    }
  }
  // Add padding so things don't sit flush against the minimap edge.
  const pad = 80;
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(800, maxX - minX + pad * 2),
    h: Math.max(600, maxY - minY + pad * 2)
  };
}

export function Minimap() {
  const board = useWhiteboardStore((s) => s.activeBoard());
  const setCamera = useWhiteboardStore((s) => s.setCamera);
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Viewport dimensions of the actual board area — driven by ResizeObserver
  // so the "you are here" rect stays accurate while the window resizes.
  const [viewport, setViewport] = React.useState({ w: 1, h: 1 });

  React.useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-board-viewport]");
    if (!root) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setViewport({ w: r.width, h: r.height });
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // Track an in-flight animation so we can cancel it cleanly when the user
  // starts a new pan.
  const animRef = React.useRef<{ stop: () => void } | null>(null);
  const stopAnim = () => {
    animRef.current?.stop();
    animRef.current = null;
  };

  /** Drag bookkeeping. We set this on pointerdown and let pointermove update
   *  the camera in real time; pointerup clears it. */
  const draggingRef = React.useRef(false);

  if (!board) return null;
  const bounds = computeContentBounds(board.elements);
  const scale = Math.min(MAP_W / bounds.w, MAP_H / bounds.h);

  const camera = board.camera;
  const vx = -camera.x / camera.zoom;
  const vy = -camera.y / camera.zoom;
  const vw = viewport.w / camera.zoom;
  const vh = viewport.h / camera.zoom;

  const mapX = (x: number) => (x - bounds.x) * scale;
  const mapY = (y: number) => (y - bounds.y) * scale;

  /** Center the camera on the given minimap-px coordinates. `smooth=false`
   *  is used during drag for instant feedback; `true` for one-shot clicks. */
  const panToMapPoint = (cx: number, cy: number, smooth: boolean) => {
    const canvasCX = cx / scale + bounds.x;
    const canvasCY = cy / scale + bounds.y;
    const targetX = -canvasCX * camera.zoom + viewport.w / 2;
    const targetY = -canvasCY * camera.zoom + viewport.h / 2;
    stopAnim();
    if (!smooth) {
      setCamera({ x: targetX, y: targetY });
      return;
    }
    // Springy tween from current → target. Sample 60fps via framer's animate.
    const startX = camera.x;
    const startY = camera.y;
    const xCtrl = animate(startX, targetX, {
      type: "spring",
      stiffness: 240,
      damping: 28,
      onUpdate: (v) => setCamera({ x: v })
    });
    const yCtrl = animate(startY, targetY, {
      type: "spring",
      stiffness: 240,
      damping: 28,
      onUpdate: (v) => setCamera({ y: v })
    });
    animRef.current = {
      stop: () => {
        xCtrl.stop();
        yCtrl.stop();
      }
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    panToMapPoint(e.clientX - rect.left, e.clientY - rect.top, true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // While dragging, skip the spring — track the cursor 1:1 for responsiveness.
    panToMapPoint(e.clientX - rect.left, e.clientY - rect.top, false);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-floating overflow-hidden cursor-crosshair select-none touch-none"
      style={{ width: MAP_W, height: MAP_H }}
      title="Click or drag to pan"
    >
      {/* Element bounding boxes */}
      <svg
        width={MAP_W}
        height={MAP_H}
        className="absolute inset-0 pointer-events-none"
      >
        {board.elements.map((el) => {
          if (el.kind === "path") {
            // Approximate a path with its bounding box.
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (let i = 0; i < el.points.length; i += 2) {
              const x = el.points[i];
              const y = el.points[i + 1];
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
            return (
              <rect
                key={el.id}
                x={mapX(minX)}
                y={mapY(minY)}
                width={(maxX - minX) * scale}
                height={(maxY - minY) * scale}
                fill={el.color}
                opacity={0.7}
                rx={2}
              />
            );
          }
          if (el.kind === "line") {
            return (
              <line
                key={el.id}
                x1={mapX(el.x)}
                y1={mapY(el.y)}
                x2={mapX(el.x2)}
                y2={mapY(el.y2)}
                stroke={el.color}
                strokeWidth={1.5}
              />
            );
          }
          if (el.kind === "connection") {
            // Skip — connection lines aren't worth the lookup overhead in the
            // tiny minimap; the connected notes already show.
            return null;
          }
          const w = (el as { w?: number }).w ?? 100;
          const h = (el as { h?: number }).h ?? 30;
          let fill = "rgba(148,163,184,0.5)";
          if (el.kind === "note") fill = "rgba(251,191,36,0.6)";
          if (el.kind === "rect" || el.kind === "circle")
            fill = (el as { color?: string }).color ?? fill;
          if (el.kind === "text") fill = "rgba(34,211,238,0.6)";
          return (
            <rect
              key={el.id}
              x={mapX(el.x)}
              y={mapY(el.y)}
              width={w * scale}
              height={h * scale}
              fill={fill}
              opacity={0.85}
              rx={2}
            />
          );
        })}
        {/* Viewport indicator — slightly emphasised so it's easy to read at
            a glance. */}
        <rect
          x={mapX(vx)}
          y={mapY(vy)}
          width={vw * scale}
          height={vh * scale}
          fill="rgba(34,211,238,0.12)"
          stroke="rgba(34,211,238,0.95)"
          strokeWidth={1.5}
          rx={3}
        />
      </svg>
      <span className="absolute bottom-1 right-2 text-[9px] uppercase tracking-wider text-muted-foreground/80 pointer-events-none">
        Minimap
      </span>
    </div>
  );
}
