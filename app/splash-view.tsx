"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NovaMascot } from "@/components/nova-mascot";
import { useT } from "@/lib/i18n";

export default function SplashPage() {
  const t = useT();
  return (
    <main className="relative bg-background">
      <section className="grid min-h-dvh place-items-center px-6" aria-labelledby="home-title">
        <div className="text-center max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto"
        >
          <NovaMascot size={96} />
        </motion.div>

        <motion.h1
          id="home-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mt-10 text-5xl md:text-7xl font-display font-semibold tracking-tight text-balance"
        >
          <span className="neon-text">Obsidian</span>: {t("the future of secure communication")}.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground text-balance"
        >
          {t("Private chats, voice and video calls, ghost rooms, stories, communities, whiteboards and secure files — one luminous workspace for the people, ideas and conversations that matter.")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="mt-10 flex items-center justify-center gap-3 flex-wrap"
        >
          <Button asChild size="xl" variant="gradient" className="group">
            <Link href="/onboarding">
              {t("Enter Obsidian")}
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="glass">
            <Link href="/login">
              <Sparkles className="mr-1" />
              {t("I already have an account")}
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
            {t("End-to-end encrypted")}
          </span>
          <span>·</span>
          <span>{t("No tracking")}</span>
          <span>·</span>
          <span>{t("Open standards")}</span>
        </motion.div>
        </div>
      </section>

      <section
        className="border-t border-border/60 bg-card/20 px-6 py-20"
        aria-labelledby="platform-overview"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              One connected communication platform
            </p>
            <h2
              id="platform-overview"
              className="mt-4 text-3xl font-display font-semibold tracking-tight md:text-5xl"
            >
              Talk, create, and collaborate without changing context.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground md:text-lg">
              Obsidian Safe &amp; Secure combines everyday communication with creative and
              collaborative tools. Conversations, live calls, shared media, communities,
              visual planning, and protected files remain connected through one account and
              one consistent interface.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className="glass rounded-3xl p-6">
              <h3 className="font-semibold">Real-time conversations</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Exchange direct, group, channel, and secret messages with presence, typing
                indicators, reactions, replies, polls, attachments, and scheduled delivery.
              </p>
            </article>
            <article className="glass rounded-3xl p-6">
              <h3 className="font-semibold">Calls and shared moments</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Move from a conversation into a LiveKit-powered voice or video call, then
                share stories, media, music, and updates without leaving the platform.
              </p>
            </article>
            <article className="glass rounded-3xl p-6">
              <h3 className="font-semibold">Spaces for collaboration</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Build communities, join ephemeral ghost rooms, and turn ideas into shared
                diagrams with a collaborative whiteboard designed for active teams.
              </p>
            </article>
            <article className="glass rounded-3xl p-6">
              <h3 className="font-semibold">Privacy-conscious by design</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Authentication, row-level data controls, secure transport, explicit privacy
                guidance, and a protected file vault help keep personal work organized.
              </p>
            </article>
          </div>

          <nav
            aria-label="Learn more about Obsidian"
            className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm"
          >
            <Link href="/about" className="text-primary hover:underline">About Obsidian</Link>
            <Link href="/contact" className="text-primary hover:underline">Contact &amp; support</Link>
            <Link href="/privacy" className="text-primary hover:underline">Privacy</Link>
            <Link href="/terms" className="text-primary hover:underline">Terms</Link>
            <a href="/llms.txt" className="text-primary hover:underline">Agent instructions</a>
          </nav>
        </div>
      </section>
    </main>
  );
}
