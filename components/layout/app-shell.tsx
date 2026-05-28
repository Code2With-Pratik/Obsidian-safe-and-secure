"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { FloatingMiniCall } from "@/components/layout/floating-dock";
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
    // `rtl:flex-row-reverse` keeps the nav sidebar on the physical left even
    // for RTL languages (Arabic). Without it, the document's dir="rtl" flips
    // the flex order and the sidebar jumps to the right edge.
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
    </div>
  );
}
