"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";

export default function TwoFactorPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [code, setCode] = React.useState<string[]>(Array(6).fill(""));
  const inputs = React.useRef<HTMLInputElement[]>([]);

  const onChange = (idx: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    setCode((c) => {
      const next = [...c];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const filled = code.every((c) => c.length === 1);

  const handleVerify = () => {
    login();
    router.push("/chats");
  };

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-3xl p-8"
      >
        <div className="text-center mb-7">
          <motion.div
            className="size-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 grid place-items-center mx-auto shadow-glow-cyan"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <ShieldCheck className="text-white" />
          </motion.div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Verify it's you</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        <div className="flex justify-center gap-2">
          {code.map((c, i) => (
            <input
              key={i}
              ref={(el) => {
                if (el) inputs.current[i] = el;
              }}
              value={c}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
              }}
              maxLength={1}
              inputMode="numeric"
              className="size-12 md:size-14 text-center text-2xl font-semibold rounded-xl glass border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ))}
        </div>

        <Button
          variant="gradient"
          size="lg"
          className="w-full mt-7 !h-12"
          disabled={!filled}
          onClick={handleVerify}
        >
          Verify
          <ArrowRight />
        </Button>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Didn't get a code?{" "}
          <button className="text-primary hover:underline">Resend</button> · or use a{" "}
          <button className="text-primary hover:underline">backup code</button>
        </div>
      </motion.div>
    </div>
  );
}
