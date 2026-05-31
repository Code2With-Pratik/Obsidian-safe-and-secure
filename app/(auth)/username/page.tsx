"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AtSign, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUsername } from "@/lib/supabase/actions";
import { useToast } from "@/components/ui/toaster";

const SUGGESTIONS = ["aria", "aria.v", "ariavance", "aria_nova", "ariavibes"];

export default function UsernamePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleClaim = async () => {
    setSubmitting(true);
    const result = await updateUsername(value);
    setSubmitting(false);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
      });
      return;
    }

    router.push("/");
  };

  React.useEffect(() => {
    if (!value) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    setAvailable(null);
    const id = setTimeout(() => {
      setChecking(false);
      setAvailable(value.length >= 3 && !["admin", "root"].includes(value));
    }, 500);
    return () => clearTimeout(id);
  }, [value]);

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-3xl p-8"
      >
        <div className="text-center mb-7">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center mx-auto shadow-glow">
            <Sparkles className="text-white" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Pick your username</h1>
          <p className="text-sm text-muted-foreground mt-1">
            This is how friends find you on Obsidian.
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="username"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^a-z0-9._]/gi, "").toLowerCase())}
              className="pl-9 pr-10 h-12 text-lg"
              placeholder="your.handle"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
              {checking ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : available ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="size-4" /> available
                </span>
              ) : available === false ? (
                <span className="text-rose-400">taken</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setValue(s)}
                className="text-xs px-2.5 py-1 rounded-lg glass-subtle hover:bg-foreground/5 transition"
              >
                @{s}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="gradient"
          size="lg"
          className="w-full mt-7 !h-12"
          disabled={!available || submitting}
          onClick={handleClaim}
        >
          {submitting ? <Loader2 className="animate-spin" /> : `Claim @${value || "your.handle"}`}
        </Button>

        <Link
          href="/"
          className="block text-center text-xs text-muted-foreground mt-4 hover:text-foreground"
        >
          Skip for now
        </Link>
      </motion.div>
    </div>
  );
}
