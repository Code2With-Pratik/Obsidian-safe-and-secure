"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { FloatingMiniCall } from "@/components/layout/floating-dock";
import { CallSessionProvider } from "@/components/layout/call-session-provider";
import { NotificationToasts } from "@/components/notifications/notification-toasts";
import { AIThemeBridge } from "@/features/ai/theme-bridge";
import { ImageLightboxProvider } from "@/features/chat/image-lightbox";
import { cn } from "@/lib/utils";

const FOCUSED_PATTERNS = [
  /^\/chats\/[^/]+/, // open chat
  /^\/calls\/active/, // active call
  /^\/whiteboard/, // whiteboard canvas
  /^\/stories\/create/ // story editor
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const focused = FOCUSED_PATTERNS.some((re) => re.test(pathname));

  return (
    // CallSessionProvider hoists the LiveKitRoom up here so navigating away
    // from /calls/active (Minimize button) keeps the room mounted and audio
    // / video flowing in the background. The /calls/active page and the
    // FloatingMiniCall dock both render INSIDE that room as siblings.
    <CallSessionProvider>
      {/* Lifted ImageLightboxProvider so EVERY surface — chat list rail,
          Topbar header, ChatDetailsPanel, ChatMembersCard, anywhere — can
          call useImageLightbox().open([...]) to view a photo full-size.
          Previously this provider only wrapped the chat thread, which
          meant clicking an avatar in the chat list was a no-op silent. */}
      <ImageLightboxProvider>
        {/* `rtl:flex-row-reverse` keeps the nav sidebar on the physical left
            even for RTL languages (Arabic). Without it, the document's
            dir="rtl" flips the flex order and the sidebar jumps to the right. */}
        <div className="relative flex min-h-dvh rtl:flex-row-reverse">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Topbar />
            <main className={cn("flex-1 min-h-0", !focused && "pb-[72px] md:pb-0")}>
              {children}
            </main>
          </div>
          {!focused && <MobileNav />}
          <FloatingMiniCall />
          {/* Global iOS-style toast stack — listens to the notifications
              store's per-add queue and renders top-right banners. Portaled
              so it survives any transformed/filtered ancestor. */}
          <NotificationToasts />
          {/* Invisible — caches next-themes' setTheme in a module slot so AI
              tool handlers can switch the theme without going through React. */}
          <AIThemeBridge />
        </div>
      </ImageLightboxProvider>
    </CallSessionProvider>
  );
}
