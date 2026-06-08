"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 *  PasswordInput — drop-in replacement for `<Input type="password" />`
 *  that adds an eye/eye-off toggle on the right edge. Designed to play
 *  nicely with the existing inline icon pattern (e.g. a LockKeyhole on
 *  the left): keep the consumer's `className` for left padding intact
 *  and we tack on `pr-10` so the text never collides with the toggle.
 *
 *  Accessibility:
 *    • The toggle is a real `<button type="button">` so it doesn't
 *      submit the form when clicked.
 *    • `aria-label` flips between Show/Hide so screen readers narrate
 *      the action, not just the icon.
 *    • `aria-pressed` reflects current state so AT users hear whether
 *      the password is currently revealed.
 *
 *  Compatible with react-hook-form: `forwardRef` passes the ref to the
 *  underlying input so `register("password")` works unchanged.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          // Reserve room on the right so the eye button never overlaps
          // the typed value. Consumer's left-padding (e.g. pl-9 for an
          // inline icon) is preserved via the spread `className`.
          className={cn("pr-10", className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          // Sit perfectly centered against the input's height. The hit
          // area is wider than the icon so taps on mobile land easily
          // without resizing the input.
          className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition"
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
