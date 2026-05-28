"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { ACCENTS, useSettingsStore } from "@/store/use-settings-store";
import { RTL_LANGS } from "@/lib/i18n";

/**
 * Applies live appearance settings to the document:
 *  - accent  → rewrites the `--primary` / `--ring` HSL tokens app-wide
 *  - glass   → sets `--glass-scale` (consumed by the .glass* blur calc())
 *  - reduce-motion → toggles a `.reduce-motion` class + framer's MotionConfig
 *
 * Wraps the whole app so MotionConfig can globally damp transforms when the
 * user opts out of motion.
 */
export function SettingsEffects({ children }: { children: React.ReactNode }) {
  const accent = useSettingsStore((s) => s.accent);
  const font = useSettingsStore((s) => s.font);
  const glass = useSettingsStore((s) => s.glass);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const language = useSettingsStore((s) => s.language);

  // Accent → CSS variables.
  React.useEffect(() => {
    const found = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];
    const root = document.documentElement;
    root.style.setProperty("--primary", found.hsl);
    root.style.setProperty("--ring", found.hsl);
  }, [accent]);

  // Font → repoints `--font-sans` / `--font-display` at the chosen font's
  // `--font-<id>` token (all of which are mounted on <html>). "default" clears
  // the override so the base Inter (set via the next/font class) takes over.
  React.useEffect(() => {
    const root = document.documentElement;
    if (!font || font === "default") {
      root.style.removeProperty("--font-sans");
      root.style.removeProperty("--font-display");
    } else {
      root.style.setProperty("--font-sans", `var(--font-${font})`);
      root.style.setProperty("--font-display", `var(--font-${font})`);
    }
  }, [font]);

  // Glass intensity → scale factor. 80 (the default) maps to 1.0; 0 removes
  // the blur entirely, 100 pushes it a touch further.
  React.useEffect(() => {
    const scale = glass / 80;
    document.documentElement.style.setProperty("--glass-scale", String(scale));
  }, [glass]);

  // Reduce motion → CSS class (kills CSS animations/transitions). The
  // MotionConfig below handles framer-motion.
  React.useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  // Language → document lang + text direction (RTL for Arabic).
  React.useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGS.has(language) ? "rtl" : "ltr";
  }, [language]);

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
      {children}
    </MotionConfig>
  );
}
