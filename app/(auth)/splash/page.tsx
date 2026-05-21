"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NovaLogo } from "@/components/brand/nova-logo";

export default function SplashPage() {
  return (
    <div className="relative grid min-h-dvh place-items-center px-6">
      <div className="text-center max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto"
        >
          <NovaLogo className="h-24 w-24 mx-auto" animated />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mt-10 text-5xl md:text-7xl font-display font-semibold tracking-tight text-balance"
        >
          The future of <span className="neon-text">communication</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground text-balance"
        >
          Chats, calls, ghost rooms, stories, whiteboards and an internal browser — one luminous operating system for the
          people, ideas and stories you carry with you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="mt-10 flex items-center justify-center gap-3 flex-wrap"
        >
          <Button asChild size="xl" variant="gradient" className="group">
            <Link href="/onboarding">
              Enter Nova
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="glass">
            <Link href="/login">
              <Sparkles className="mr-1" />
              I already have an account
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-16 flex items-center justify-center gap-6 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            End-to-end encrypted
          </span>
          <span>·</span>
          <span>No tracking</span>
          <span>·</span>
          <span>Open standards</span>
        </motion.div>
      </div>
    </div>
  );
}
