"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, LockKeyhole, Mail, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { NovaMascot } from "@/components/nova-mascot";
import { signup as supabaseSignup } from "@/lib/supabase/actions";
import { useToast } from "@/components/ui/toaster";

const schema = z
  .object({
    name: z.string().min(2, "Tell us your name"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "8 characters minimum"),
    confirm: z.string()
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords must match"
  });

type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Values) => {
    const result = await supabaseSignup(data);

    if (result?.error) {
      toast({
        title: "Registration Failed",
        description: result.error,
      });
      return;
    }

    if (result?.requiresConfirmation) {
      toast({
        title: "Account Created!",
        description: result.message || "Please check your email inbox to confirm your email before signing in.",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Account created! Now pick your username.",
    });
    router.push("/username");
  };

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass rounded-3xl border border-black/50 dark:border-white/70 p-8"
      >
        <div className="flex flex-col items-center text-center mb-7">
          <NovaMascot size={56} />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Create your Obsidian</h1>
          <p className="text-sm text-muted-foreground mt-1">
            One identity. Infinite ways to connect.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <div className="relative">
              <User2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="name" placeholder="Aria Vance" className="pl-9" {...register("name")} />
            </div>
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="you@nova.app" className="pl-9" {...register("email")} />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
                <PasswordInput id="password" className="pl-9" {...register("password")} />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm</Label>
              <PasswordInput id="confirm" {...register("confirm")} />
              {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            By signing up you agree to our{" "}
            <Link href="/terms" className="text-foreground/80 underline underline-offset-2 hover:text-primary">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-foreground/80 underline underline-offset-2 hover:text-primary">Privacy Policy</Link>.
          </p>

          <Button type="submit" variant="gradient" size="lg" className="w-full !h-12" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Continue"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
