"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string, defaultValue = false) {
  // Read matchMedia synchronously on first client render — otherwise every
  // consumer briefly sees `defaultValue` for one tick, which made the chat
  // details panel flash a fullscreen "mobile overlay" on desktop loads
  // before switching to the docked layout. SSR falls back to `defaultValue`.
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return defaultValue;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    // Re-sync once mounted in case the value differed during hydration.
    setMatches(m.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
