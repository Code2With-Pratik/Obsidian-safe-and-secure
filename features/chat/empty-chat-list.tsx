"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { users } from "@/lib/mock-data";
import { useT } from "@/lib/i18n";

interface Props {
  onEnter: () => void;
}

export function EmptyChatList({ onEnter }: Props) {
  const t = useT();
  // Up to 8 portraits around the ring so the rotation feels populated.
  const ring = users.filter((u) => u.id !== "me").slice(0, 8);

  const glowColors = [
    "#A78BFA", // violet
    "#22D3EE", // cyan
    "#F472B6", // pink
    "#FBBF24", // amber
    "#A3E635", // lime
    "#60A5FA", // sky
    "#FB7185", // rose
    "#34D399"  // emerald
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 pt-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[320px] aspect-square"
      >
        {/* rotating avatar ring */}
        <div className="absolute inset-0 grid place-items-center">
          <motion.div
            className="relative"
            style={{ width: 300, height: 300 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
          >
            {ring.map((u, i) => {
              const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
              const radius = 112;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const glow = glowColors[i % glowColors.length];
              return (
                <div
                  key={u.id}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    transform: `translate(-50%,-50%) translate(${x}px, ${y}px)`
                  }}
                >
                  <motion.div
                    animate={{ rotate: -360, y: [0, -4, 0], scale: [1, 1.06, 1] }}
                    transition={{
                      rotate: { duration: 36, repeat: Infinity, ease: "linear" },
                      y: {
                        duration: 2.6 + (i % 4) * 0.35,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.12
                      },
                      scale: {
                        duration: 3.4 + (i % 3) * 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.1
                      }
                    }}
                    className="relative"
                    style={{ width: 60, height: 60 }}
                  >
                    {/* colored backdrop glow */}
                    <motion.div
                      className="absolute inset-[-14px] rounded-2xl pointer-events-none"
                      style={{
                        background: `radial-gradient(closest-side, ${glow}cc, transparent 70%)`,
                        filter: "blur(12px)"
                      }}
                      animate={{ opacity: [0.55, 0.95, 0.55] }}
                      transition={{
                        duration: 2.6 + (i % 4) * 0.4,
                        repeat: Infinity,
                        delay: i * 0.15
                      }}
                    />
                    {/* avatar tile on white — rounded-xl, not fully round */}
                    <div
                      className="relative grid place-items-center size-[60px] rounded-xl bg-white overflow-hidden"
                      style={{
                        boxShadow: `0 6px 18px -4px ${glow}99, 0 0 0 2px white, 0 0 0 4px ${glow}55`
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* center wordmark — pure gradient text, static */}
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <span
            className="text-[52px] font-display font-semibold leading-none tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, #4338CA 0%, #7C3AED 35%, #DB2777 70%, #F97316 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent"
            }}
          >
            {t("Hello")}
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center mt-7 max-w-xs"
      >
        <h2 className="text-3xl font-display font-semibold tracking-tight">
          {t("Friend's")} <span className="neon-text">{t("Contact")}</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          {t("Enjoy the first AI-powered chat.")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-6 w-full max-w-xs"
      >
        <Button
          size="lg"
          variant="glass"
          onClick={onEnter}
          className="w-full !h-12 !rounded-full !text-base !bg-foreground !text-background hover:!bg-foreground/90"
        >
          {t("Enter")}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          {t("Search a friend to start chatting")}
        </p>
      </motion.div>
    </div>
  );
}
