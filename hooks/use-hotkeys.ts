"use client";

import { useEffect } from "react";

type Combo = string; // "mod+k", "shift+/", "esc"

function matches(e: KeyboardEvent, combo: Combo) {
  const parts = combo.toLowerCase().split("+");
  const key = parts.pop()!;
  const wantMod = parts.includes("mod");
  const wantShift = parts.includes("shift");
  const wantAlt = parts.includes("alt");

  const modPressed = e.metaKey || e.ctrlKey;
  if (wantMod !== modPressed) return false;
  if (wantShift !== e.shiftKey) return false;
  if (wantAlt !== e.altKey) return false;

  const norm =
    key === "esc"
      ? "escape"
      : key === "space"
      ? " "
      : key;
  return e.key.toLowerCase() === norm.toLowerCase();
}

export function useHotkeys(map: Record<Combo, (e: KeyboardEvent) => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const combo of Object.keys(map)) {
        if (matches(e, combo)) {
          e.preventDefault();
          map[combo](e);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map]);
}
