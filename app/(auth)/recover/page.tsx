"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RecoverPage() {
  const [sent, setSent] = React.useState(false);

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-3xl p-8"
      >
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="size-3" /> Back to login
        </Link>

        <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-pink-500 grid place-items-center shadow-glow-pink">
          <KeyRound className="text-white" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Reset your access</h1>
        <p className="text-sm text-muted-foreground mt-1">
          We'll send a sealed recovery link to your inbox. The link expires in 15 minutes.
        </p>

        {sent ? (
          <div className="mt-6 p-4 rounded-xl glass-subtle border border-emerald-400/30 text-sm">
            <p>Check your inbox at <span className="font-medium">you@nova.app</span>.</p>
            <p className="text-muted-foreground text-xs mt-1">
              Didn't arrive? <button onClick={() => setSent(false)} className="text-primary">Try again</button>
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="mt-6 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="rec-email">Account email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="rec-email" type="email" defaultValue="aria@nova.app" className="pl-9" />
              </div>
            </div>
            <Button variant="gradient" size="lg" className="w-full !h-12">
              Send recovery link
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-border/60 text-xs text-muted-foreground">
          Lost everything? <Link href="/recover" className="text-primary hover:underline">Use 24-word seed phrase</Link>
        </div>
      </motion.div>
    </div>
  );
}
