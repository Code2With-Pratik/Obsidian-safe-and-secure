"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/lib/supabase/actions";
import { useToast } from "@/components/ui/toaster";
import { useNotificationsStore } from "@/store/use-notifications-store";

const schema = z
  .object({
    password: z.string().min(8, "8 characters minimum"),
    confirm: z.string()
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords must match"
  });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Values) => {
    const result = await updatePassword(data.password);

    if (result?.error) {
      toast({
        title: "Update Failed",
        description: result.error,
      });
      return;
    }

    useNotificationsStore.getState().add({
      kind: "system",
      title: "Password Changed",
      body: "Your account password was updated successfully.",
      targetHref: "/settings"
    });

    toast({
      title: "Password Reset Successful",
      description: "Your password has been updated and you are now signed in.",
    });

    router.push("/chats");
  };

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass rounded-3xl p-8"
      >
        <div className="flex flex-col items-center text-center mb-7">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow-cyan">
            <ShieldCheck className="text-white" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">New password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a strong password to protect your Obsidian.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
              <PasswordInput id="password" placeholder="••••••••" className="pl-9" {...register("password")} />
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
              <PasswordInput id="confirm" placeholder="••••••••" className="pl-9" {...register("confirm")} />
            </div>
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>

          <div className="pt-2 flex gap-3">
            <Button 
              type="button" 
              variant="glass" 
              className="flex-1" 
              onClick={() => router.push("/login")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" className="flex-[2] !h-12" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirm new password"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
