"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  AtSign,
  PhoneCall,
  Ghost,
  Heart,
  Sparkles,
  X
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  subscribeToToasts,
  drainToasts,
  useNotificationsStore,
  type Notification,
  type NotifKind
} from "@/store/use-notifications-store";

/** Same icon-per-kind palette as the in-panel cards so a toast and its
 *  corresponding row in the notification center read as the same thing. */
const kindStyle: Record<NotifKind, { icon: React.ReactNode; color: string }> = {
  message: { icon: <MessageCircle className="size-3.5" />, color: "from-violet-500 to-fuchsia-500" },
  mention: { icon: <AtSign className="size-3.5" />, color: "from-cyan-400 to-blue-500" },
  call: { icon: <PhoneCall className="size-3.5" />, color: "from-emerald-400 to-cyan-400" },
  ghost: { icon: <Ghost className="size-3.5" />, color: "from-violet-500 to-pink-500" },
  reaction: { icon: <Heart className="size-3.5" />, color: "from-pink-500 to-rose-500" },
  system: { icon: <Sparkles className="size-3.5" />, color: "from-amber-400 to-pink-500" }
};

/** Per-toast on-screen lifetime in ms. iOS-banner style: long enough to
 *  read the body, short enough that a burst doesn't pile up. */
const TOAST_TTL_MS = 5000;
/** Max visible at a time. Older ones drop off the top of the stack
 *  silently if more arrive in quick succession. */
const MAX_VISIBLE = 3;

/**
 * Global top-right notification toast stack — iOS-style banners.
 *
 * Subscribes to the module-level toast queue exposed by the
 * notifications store. Every `useNotificationsStore.add()` call pushes
 * a notification onto that queue and fires our listener. We render up to
 * three at a time; each auto-dismisses after 5s, and a click navigates
 * to its bound targetHref and marks it read.
 *
 * Mounts once in the app shell so toasts fire from every route.
 * Portaled to <body> so its z-index lives in the root stacking context
 * and stays above the topbar / AI panel / etc.
 */
export function NotificationToasts() {
  const router = useRouter();
  const markOne = useNotificationsStore((s) => s.markOne);
  const [active, setActive] = React.useState<Notification[]>([]);
  const [mounted, setMounted] = React.useState(false);
  // Per-toast timer ids so we can clear if the user dismisses early.
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  React.useEffect(() => setMounted(true), []);

  // Subscribe to the toast queue. Every time the store fires its
  // listener (post-add()), drain the queue and append into the active
  // list — capping at MAX_VISIBLE by dropping the oldest.
  React.useEffect(() => {
    const unsub = subscribeToToasts(() => {
      const drained = drainToasts();
      if (drained.length === 0) return;
      setActive((prev) => {
        const next = [...prev, ...drained];
        // Trim from the front so the latest toasts are always visible.
        return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
      });
    });
    return () => {
      unsub();
    };
  }, []);

  // Auto-dismiss timers — set one per toast as soon as it enters `active`.
  React.useEffect(() => {
    const timers = timersRef.current;
    active.forEach((t) => {
      if (timers.has(t.id)) return;
      const handle = setTimeout(() => {
        setActive((prev) => prev.filter((x) => x.id !== t.id));
        timers.delete(t.id);
      }, TOAST_TTL_MS);
      timers.set(t.id, handle);
    });
    // Clean up stale timers for toasts that vanished some other way
    // (e.g. user dismissed manually).
    return () => {
      // Intentionally NOT clearing timers here — they're still needed
      // for the currently-active toasts. Cleanup happens per-id when
      // their handler fires.
    };
  }, [active]);

  // Clear all pending timers on unmount.
  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((h) => clearTimeout(h));
      timers.clear();
    };
  }, []);

  const dismiss = (id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
    setActive((prev) => prev.filter((x) => x.id !== id));
  };

  const activate = (n: Notification) => {
    // Mark read first so the bell badge shrinks immediately, then
    // navigate (if a route is bound) and dismiss the toast.
    if (!n.read) markOne(n.id);
    dismiss(n.id);
    if (n.targetHref) router.push(n.targetHref);
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      // Wider than the bell badge but narrow enough to leave room next
      // to the topbar's right-side icons.
      style={{ width: "min(22rem, calc(100vw - 2rem))" }}
    >
      <AnimatePresence initial={false}>
        {active.map((n) => {
          const style = kindStyle[n.kind];
          return (
            <motion.button
              key={n.id}
              type="button"
              layout
              initial={{ opacity: 0, x: 32, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 32, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={() => activate(n)}
              className={cn(
                "pointer-events-auto w-full text-left group relative",
                "glass-strong glass-specular border border-border/60 shadow-floating",
                "rounded-2xl px-3 py-2.5 flex gap-3 items-start",
                "hover:bg-foreground/[0.04] transition"
              )}
            >
              {/* Sender avatar OR a gradient-tinted kind icon — same
                  visual treatment as the in-panel NotifCard. */}
              {n.avatar ? (
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={n.avatar} />
                  <AvatarFallback>{n.title[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className={cn(
                    "size-9 shrink-0 rounded-xl grid place-items-center text-white bg-gradient-to-br",
                    style.color
                  )}
                >
                  {style.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-tight truncate">
                  {n.title}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                  {n.body}
                </p>
              </div>
              {/* Manual dismiss — click anywhere except this X to
                  activate the toast; the X stops propagation so it just
                  closes the banner without navigating. */}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(n.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition size-5 rounded-full grid place-items-center text-muted-foreground hover:bg-foreground/10"
                aria-label="Dismiss"
              >
                <X className="size-3" />
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
