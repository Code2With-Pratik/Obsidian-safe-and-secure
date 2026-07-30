"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Mail, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword, verifyRecoveryOtp } from "@/lib/supabase/actions";
import { useToast } from "@/components/ui/toaster";

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
}

function OtpInput({ value, onChange }: OtpInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const handleChange = (index: number, char: string) => {
    const clean = char.replace(/[^0-9]/g, "");
    if (!clean) {
      const newDigits = [...digits];
      newDigits[index] = "";
      onChange(newDigits.join(""));
      return;
    }

    const lastChar = clean[clean.length - 1];
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    const combined = newDigits.join("");
    onChange(combined);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const targetIndex = Math.min(pasted.length, 5);
      inputRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 py-3">
      {/* First 3 boxes */}
      <div className="flex gap-2">
        {[0, 1, 2].map((idx) => (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[idx]}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className="size-11 sm:size-12 rounded-xl text-center text-xl font-bold font-mono bg-background/50 border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
            autoFocus={idx === 0}
          />
        ))}
      </div>

      {/* 3-gap-3 Divider */}
      <div className="w-3 h-0.5 bg-primary/40 rounded-full mx-1 sm:mx-1.5" />

      {/* Second 3 boxes */}
      <div className="flex gap-2">
        {[3, 4, 5].map((idx) => (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[idx]}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className="size-11 sm:size-12 rounded-xl text-center text-xl font-bold font-mono bg-background/50 border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
          />
        ))}
      </div>
    </div>
  );
}

export default function RecoverPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"email" | "otp">("email");
  const [loading, setLoading] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const { toast } = useToast();

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (result?.error) {
      toast({
        title: "Error",
        description: result.error,
      });
      return;
    }

    toast({
      title: "OTP Sent!",
      description: `A 6-digit verification code has been sent to ${email}`,
    });
    setStep("otp");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the complete 6-digit verification code.",
      });
      return;
    }

    setVerifying(true);
    const result = await verifyRecoveryOtp(email, otp.trim());
    setVerifying(false);

    if (result?.error) {
      toast({
        title: "Verification Failed",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Code Verified!",
      description: "Redirecting to set your new password...",
    });
    router.push("/reset-password");
  };

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

        {step === "email" ? (
          <>
            <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-pink-500 grid place-items-center shadow-glow-pink">
              <KeyRound className="text-white" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Reset your access</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email to receive a 6-digit OTP verification code.
            </p>

            <form onSubmit={handleSendEmail} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rec-email">Account email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    id="rec-email" 
                    type="email" 
                    placeholder="aria@nova.app" 
                    className="pl-9" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button variant="gradient" size="lg" className="w-full !h-12" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Send 6-digit OTP"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow-cyan">
              <ShieldCheck className="text-white" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Verify 6-Digit OTP</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the code sent to <span className="font-medium text-foreground">{email}</span>.
            </p>

            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-center block text-xs text-muted-foreground uppercase tracking-wider">6-Digit Code</Label>
                <OtpInput value={otp} onChange={setOtp} />
              </div>

              <Button variant="gradient" size="lg" className="w-full !h-12" disabled={verifying || otp.length < 6}>
                {verifying ? <Loader2 className="animate-spin" /> : "Verify OTP & Continue"}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Didn't receive code? Resend OTP
                </button>
              </div>
            </form>
          </>
        )}

        <div className="mt-6 pt-6 border-t border-border/60 text-xs text-muted-foreground">
          Need help? <Link href="/login" className="text-primary hover:underline">Contact Support</Link>
        </div>
      </motion.div>
    </div>
  );
}
