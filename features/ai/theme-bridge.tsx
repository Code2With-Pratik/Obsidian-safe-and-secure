"use client";

/**
 *  Tiny bridge that lets the (non-React) tool handlers in `tools/handlers.ts`
 *  call next-themes' `setTheme`. We can't import `useTheme()` directly into a
 *  plain async function — it has to come from a component's render. So we
 *  mount this invisible bridge inside the layout tree, capture the setter
 *  on every render into a module-level slot, and the handlers read the
 *  slot when a tool call fires.
 *
 *  The pattern mirrors the toast queue / whiteboard broadcast wiring used
 *  elsewhere in the codebase: zero-state component → setter ref captured.
 */

import * as React from "react";
import { useTheme } from "next-themes";

let _setTheme: ((theme: string) => void) | null = null;

/** Called by handlers — returns true if the bridge was mounted + the
 *  switch took effect, false if no bridge is mounted (would only happen
 *  during a render pass before AIThemeBridge first mounts, which doesn't
 *  happen in practice because AppShell renders it eagerly). */
export function applyTheme(theme: "light" | "dark" | "system"): boolean {
  if (!_setTheme) return false;
  _setTheme(theme);
  return true;
}

export function AIThemeBridge() {
  const { setTheme } = useTheme();
  React.useEffect(() => {
    _setTheme = setTheme;
    return () => {
      _setTheme = null;
    };
  }, [setTheme]);
  return null;
}
