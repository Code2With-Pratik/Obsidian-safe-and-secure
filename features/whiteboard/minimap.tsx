"use client";

import * as React from "react";
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
  // Viewport dimensions of the actual board area — measured once on mount,
  // updated on resize, used to draw the "you are here" rect.
  const [viewport, setViewport] = React.useState({ w: 1, h: 1 });

  React.useEffect(() => {
    const update = () => {
      const root = document.querySelector<HTMLElement>("[data-board-viewport]");
      if (root) {
        const r = root.getBoundingClientRect();
        setViewport({ w: r.width, h: r.height });
      }
    };
    update();
    window.addEventListener("resize", update);
    const id = window.setInterval(update, 1000);
    return () => {
      window.removeEventListener("resize", update);
      window.clearInterval(id);
    };
  }, []);

  if (!board) return null;
  const bounds = computeContentBounds(board.elements);
  const scaleX = MAP_W / bounds.w;
  const scaleY = MAP_H / bounds.h;
  const scale = Math.min(scaleX, scaleY);

  // Visible region in canvas space = (-camera.x / zoom, -camera.y / zoom) to
  // (-camera.x + viewport.w) / zoom etc.
  const camera = board.camera;
  const vx = (-camera.x) / camera.zoom;
  const vy = (-camera.y) / camera.zoom;
  const vw = viewport.w / camera.zoom;
  const vh = viewport.h / camera.zoom;

  const mapX = (x: number) => (x - bounds.x) * scale;
  const mapY = (y: number) => (y - bounds.y) * scale;

  /** Click-to-pan: clicking anywhere on the minimap centers the canvas
   *  there. */
  const handleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    // Convert minimap-px back to canvas-px
    const canvasX = cx / scale + bounds.x;
    const canvasY = cy / scale + bounds.y;
    // Center viewport on that canvas point
    const camX = -canvasX * camera.zoom + viewport.w / 2;
    const camY = -canvasY * camera.zoom + viewport.h / 2;
    setCamera({ x: camX, y: camY });
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="relative rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-floating overflow-hidden cursor-pointer"
      style={{ width: MAP_W, height: MAP_H }}
      title="Click to pan"
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
        {/* Viewport indicator */}
        <rect
          x={mapX(vx)}
          y={mapY(vy)}
          width={vw * scale}
          height={vh * scale}
          fill="none"
          stroke="rgba(34,211,238,0.9)"
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
