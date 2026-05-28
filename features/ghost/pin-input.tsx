"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface Props {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  /** When true, render an error-tinted ring. */
  error?: boolean;
  /** Fires when the user fills the last digit. */
  onComplete?: (value: string) => void;
  /** Mask each digit as a dot — useful when showing the PIN of a private room. */
  mask?: boolean;
}

export function PinInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  error = false,
  onComplete,
  mask = false
}: Props) {
  const t = useT();
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const digits = React.useMemo(() => {
    const arr = Array.from({ length }, (_, i) => value[i] ?? "");
    return arr;
  }, [value, length]);

  const update = (next: string) => {
    const sanitized = next.replace(/\D/g, "").slice(0, length);
    onChange(sanitized);
    if (sanitized.length === length) onComplete?.(sanitized);
  };

  const handleChange = (idx: number, raw: string) => {
    const ch = raw.replace(/\D/g, "");
    // Paste handler: if user pastes a long string, distribute it from idx.
    if (ch.length > 1) {
      const prefix = value.slice(0, idx);
      update((prefix + ch).slice(0, length));
      const lastFilled = Math.min(length - 1, idx + ch.length - 1);
      refs.current[lastFilled + 1]?.focus();
      return;
    }
    const chars = value.split("");
    chars[idx] = ch;
    const next = chars.join("").slice(0, length);
    update(next);
    if (ch && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        const chars = value.split("");
        chars[idx] = "";
        update(chars.join(""));
        return;
      }
      // Cell already empty — step back and clear previous.
      if (idx > 0) {
        const chars = value.split("");
        chars[idx - 1] = "";
        update(chars.join(""));
        refs.current[idx - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          value={mask && d ? "•" : d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`${t("Digit")} ${i + 1}`}
          className={cn(
            "size-11 sm:size-12 text-center text-lg font-semibold rounded-xl bg-background/40 border outline-none transition",
            "focus-visible:ring-2 focus-visible:ring-cyan-400/60",
            error
              ? "border-rose-400/70 ring-1 ring-rose-400/40"
              : "border-border/60 focus-visible:border-cyan-400/60"
          )}
        />
      ))}
    </div>
  );
}
