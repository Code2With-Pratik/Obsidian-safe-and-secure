"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Ghost,
  Phone,
  Folder,
  User2
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const items = [
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/ghost-rooms", label: "Ghost", icon: Ghost },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/files", label: "Vault", icon: Folder },
  { href: "/profile", label: "Me", icon: User2 }
];

export function MobileNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-3xl glass glass-specular px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around">
        {items.map((it) => {
          const active = pathname?.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[56px]",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active"
                  className="absolute inset-0 rounded-xl bg-foreground/[0.06]"
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                />
              )}
              <it.icon className="relative size-5" />
              <span className="relative text-[10px] font-medium">{t(it.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
