"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

type Status = "online" | "away" | "busy" | "offline";

interface Props {
  src?: string;
  name: string;
  status?: Status;
  size?: number;
  ring?: boolean; // show gradient ring when online
  pulse?: boolean; // pulse the ring outward
  breathe?: boolean; // gentle scale loop (default: only if online)
  hoverLift?: boolean; // lift + scale on hover
  className?: string;
  alt?: string;
}

/**
 * Avatar wrapper that breathes gently, gets a rotating gradient ring + status dot,
 * and emits a soft pulse halo when the user is online. Hover lifts and brightens it.
 */
export function AnimatedAvatar({
  src,
  name,
  status = "offline",
  size = 56,
  ring = true,
  pulse = true,
  breathe,
  hoverLift = true,
  className,
  alt
}: Props) {
  const online = status === "online";
  const shouldBreathe = breathe ?? online;
  const ringSize = size + 6;
  const dotSize = Math.max(10, Math.floor(size * 0.22));

  return (
    <motion.div
      className={cn(
        "relative inline-grid place-items-center shrink-0 rounded-full",
        className
      )}
      style={{ width: ringSize, height: ringSize }}
      whileHover={hoverLift ? { y: -1.5, scale: 1.04 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {online && ring && (
        <motion.div
          className="absolute inset-0 rounded-full p-[2px]"
          style={{
            background:
              "conic-gradient(from 0deg, #8B5CF6, #EC4899, #22D3EE, #A3E635, #8B5CF6)"
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        />
      )}

      {online && pulse && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(34,211,238,0.45), transparent 70%)"
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.div
        animate={shouldBreathe ? { scale: [1, 1.025, 1] } : undefined}
        transition={shouldBreathe ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" } : undefined}
        className="relative rounded-full bg-background p-[2px] overflow-hidden"
        style={{ width: size + 4, height: size + 4 }}
      >
        <Avatar
          style={{ width: size, height: size }}
          className="!rounded-full overflow-hidden"
        >
          <AvatarImage src={src} alt={alt ?? name} className="rounded-full" />
          <AvatarFallback className="rounded-full">{initials(name)}</AvatarFallback>
        </Avatar>
      </motion.div>

      {status !== "offline" && (
        <motion.span
          className={cn(
            "absolute rounded-full ring-2 ring-background",
            status === "online" && "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]",
            status === "busy" && "bg-rose-400",
            status === "away" && "bg-amber-400"
          )}
          style={{
            width: dotSize,
            height: dotSize,
            bottom: 2,
            right: 2
          }}
          animate={online ? { scale: [1, 1.15, 1] } : undefined}
          transition={online ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
        />
      )}
    </motion.div>
  );
}
