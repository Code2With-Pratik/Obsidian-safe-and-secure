"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Apple, Github, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/use-auth-store";
import { NovaMascot } from "@/components/nova-mascot";
import { useT } from "@/lib/i18n";
import { login as supabaseLogin } from "@/lib/supabase/actions";
import { useToast } from "@/components/ui/toaster";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters")
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  });
  // Tracks which OAuth provider's button is currently mid-redirect so
  // we can render the inline spinner. Only one is active at a time.
  const [oauthBusy, setOauthBusy] = React.useState<"github" | null>(null);

  // Show whatever error the /auth/callback handler bounced back with —
  // e.g. user clicked cancel on the consent screen, or Supabase rejected
  // the code. Reads `?error=...` off the URL once on mount.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      toast({ title: "Sign-in failed", description: err });
      // Strip the param so a refresh doesn't re-fire the toast.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  const onSubmit = async (data: FormValues) => {
    const result = await supabaseLogin(data);

    if (result?.error) {
      toast({
        title: "Login Failed",
        description: result.error,
      });
      return;
    }

    router.push("/");
  };

  /** Kick off the GitHub OAuth flow. The provider must be enabled in the
   *  Supabase dashboard (Authentication → Providers → GitHub) with the
   *  GitHub OAuth app's client id + secret. Our `/auth/callback` route
   *  picks up the redirect, exchanges the code for a session cookie,
   *  and bounces to '/'. */
  const signInWithGithub = async () => {
    if (oauthBusy) return;
    setOauthBusy("github");
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo }
      });
      if (error) {
        toast({ title: "GitHub sign-in failed", description: error.message });
        setOauthBusy(null);
      }
      // On success the browser navigates to GitHub — no further action
      // here. The button remains in its busy state until the redirect.
    } catch (err) {
      toast({
        title: "GitHub sign-in failed",
        description: err instanceof Error ? err.message : "Unknown error"
      });
      setOauthBusy(null);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass rounded-3xl p-8"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <NovaMascot size={56} />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{t("Welcome back")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("Sign in to continue to Obsidian")}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <Button
            variant="glass"
            size="lg"
            className="!h-11"
            type="button"
            disabled
            title={t("Apple sign-in not configured")}
          >
            <Apple className="size-5" />
          </Button>
          <Button
            variant="glass"
            size="lg"
            className="!h-11"
            type="button"
            onClick={signInWithGithub}
            disabled={oauthBusy === "github"}
            aria-label={t("Continue with GitHub")}
          >
            {oauthBusy === "github" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Github className="size-5" />
            )}
          </Button>
          <Button
            variant="glass"
            size="lg"
            className="!h-11"
            type="button"
            disabled
            title={t("Google sign-in not configured")}
          >
            <svg viewBox="0 0 24 24" className="size-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
          </Button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-3 text-muted-foreground bg-background/50 backdrop-blur">{t("or")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("Email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="you@nova.app" className="pl-9" {...register("email")} />
            </div>
            {errors.email && <p className="text-xs text-destructive">{t(errors.email.message ?? "")}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("Password")}</Label>
              <Link href="/recover" className="text-xs text-muted-foreground hover:text-primary">
                {t("Forgot?")}
              </Link>
            </div>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
              <PasswordInput
                id="password"
                placeholder="••••••••"
                className="pl-9"
                {...register("password")}
              />
            </div>
            {errors.password && <p className="text-xs text-destructive">{t(errors.password.message ?? "")}</p>}
          </div>

          <Button type="submit" variant="gradient" size="lg" className="w-full !h-12" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : t("Continue")}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("New here?")}{" "}
          <Link href="/register" className="text-primary hover:underline">
            {t("Create an account")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
