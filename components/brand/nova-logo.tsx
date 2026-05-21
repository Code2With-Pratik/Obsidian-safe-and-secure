"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  animated?: boolean;
}

export function NovaLogo({ className, animated = false }: Props) {
  return (
    <motion.div
      className={cn("relative grid place-items-center", className)}
      animate={animated ? { rotate: [0, 8, -6, 0] } : undefined}
      transition={animated ? { duration: 9, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <motion.div
        className="absolute inset-0 rounded-[28%] bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400 blur-2xl opacity-70"
        animate={animated ? { scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] } : undefined}
        transition={animated ? { duration: 4, repeat: Infinity } : undefined}
      />
      <div className="relative grid place-items-center size-full rounded-[28%] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-glow ring-1 ring-white/30">
        <svg viewBox="0 0 24 24" className="size-1/2 text-white" fill="none">
          <path
            d="M4 4l8 16M4 4l16 8M4 4v16M20 4v16"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </motion.div>
  );
}
