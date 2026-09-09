"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Ghost,
  PhoneCall,
  Globe,
  PencilRuler,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    icon: <Ghost className="size-8" />,
    color: "from-violet-500 to-fuchsia-500",
    title: "Talk as yourself, or no one at all.",
    body: "Drop into ghost rooms — anonymous, password-protected, temporary spaces for the conversations that matter."
  },
  {
    icon: <PhoneCall className="size-8" />,
    color: "from-cyan-400 to-emerald-400",
    title: "Calls that feel like presence.",
    body: "Crystal voice, video and group meetings with floating mini calls and AI noise cancellation built in."
  },
  {
    icon: <Globe className="size-8" />,
    color: "from-fuchsia-500 to-pink-500",
    title: "Bring the web inside.",
    body: "Browse, bookmark and share links without ever leaving the chat. Split-screen browser meets messaging."
  },
  {
    icon: <PencilRuler className="size-8" />,
    color: "from-amber-400 to-pink-500",
    title: "Whiteboards for wild ideas.",
    body: "Sticky notes, drawing tools, live cursors and brainstorm mode — sketch the future together."
  },
  {
    icon: <ShieldCheck className="size-8" />,
    color: "from-emerald-400 to-cyan-400",
    title: "Encrypted, by default.",
    body: "End-to-end encrypted chats, biometric unlock and a vault for the files you'd rather keep close."
  }
];

export default function OnboardingPage() {
  const [step, setStep] = React.useState(0);
  const last = step === slides.length - 1;
  const slide = slides[step];

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-10">
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-primary" : "w-1.5 bg-foreground/15"
                }`}
              />
            ))}
          </div>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Skip
          </Link>
        </div>

        <div className="relative h-[420px]">
          <AnimatePresence mode="wait">
            <div className="absolute inset-0">
              <div className="absolute inset-1 rounded-[2rem] bg-gradient-to-br from-violet-500/35 via-fuchsia-500/25 to-cyan-400/25 blur-3xl" />
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -40, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 glass rounded-3xl border border-black/50 dark:border-white/70 p-10 flex flex-col"
              >
                <div
                  className={`size-20 rounded-3xl bg-gradient-to-br ${slide.color} grid place-items-center text-white shadow-glow mb-8`}
                >
                  {slide.icon}
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-balance">
                  {slide.title}
                </h2>
                <p className="mt-4 text-muted-foreground text-lg text-balance">{slide.body}</p>

                <div className="mt-auto flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={step === 0}
                    onClick={() => setStep((s) => s - 1)}
                  >
                    <ArrowLeft />
                    Back
                  </Button>
                  {last ? (
                    <Button asChild variant="gradient">
                      <Link href="/register">
                        <Sparkles />
                        Create an account
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="default" onClick={() => setStep((s) => s + 1)}>
                      Next
                      <ArrowRight />
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
