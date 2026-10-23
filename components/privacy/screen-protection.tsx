"use client";

import * as React from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { useSettingsStore } from "@/store/use-settings-store";

interface NativeScreenProtectionPlugin {
  setSecure(options: { enabled: boolean }): Promise<void>;
}

const NativeScreenProtection = registerPlugin<NativeScreenProtectionPlugin>(
  "ScreenProtection"
);

function isProtectedChatRoute(pathname: string) {
  return /^\/chats(?:\/|$)/.test(pathname);
}

export function ScreenProtection() {
  const pathname = usePathname() ?? "";
  const allowScreenshots = useSettingsStore((s) => s.privacy.allowScreenshots);
  const protectedRoute = isProtectedChatRoute(pathname);
  // The safe default is protected, including the brief window before the
  // signed-in account's server preference finishes hydrating.
  const protectionEnabled = protectedRoute && !allowScreenshots;
  const [obscured, setObscured] = React.useState(false);

  React.useEffect(() => {
    if (!protectionEnabled) {
      setObscured(false);
      return;
    }

    const syncVisibility = () => setObscured(document.hidden || !document.hasFocus());
    const hide = () => setObscured(true);
    const show = () => setObscured(false);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    syncVisibility();
    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
    };
  }, [protectionEnabled]);

  React.useEffect(() => {
    document.body.classList.toggle("privacy-print-protected", protectionEnabled);
    return () => document.body.classList.remove("privacy-print-protected");
  }, [protectionEnabled]);

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
    void NativeScreenProtection.setSecure({ enabled: protectionEnabled }).catch(() => {
      // Web protection remains active if a stale native build lacks the bridge.
    });
    return () => {
      void NativeScreenProtection.setSecure({ enabled: false }).catch(() => undefined);
    };
  }, [protectionEnabled]);

  return (
    <>
      {protectionEnabled && obscured && (
        <div
          className="fixed inset-0 z-[10000] grid place-items-center bg-background"
          role="status"
          aria-live="polite"
        >
          <div className="text-center px-6">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-4 font-display text-xl font-semibold">Chat protected</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Return to Obsidian to reveal this conversation.
            </p>
          </div>
        </div>
      )}
      <div id="privacy-print-notice" className="hidden" aria-hidden={!protectionEnabled}>
        This chat is protected from printing. Browser screenshot blocking cannot be guaranteed.
      </div>
      <style jsx global>{`
        @media print {
          body.privacy-print-protected * {
            visibility: hidden !important;
          }
          body.privacy-print-protected #privacy-print-notice {
            display: grid !important;
            visibility: visible !important;
            position: fixed;
            inset: 0;
            place-items: center;
            padding: 2rem;
            color: #111;
            background: #fff;
            font: 600 16px/1.5 sans-serif;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}
