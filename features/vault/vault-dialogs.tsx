"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Folder, Lock, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
 * Tiny shared modal scaffold (mirrors attachment-dialogs).
 * ───────────────────────────────────────────────────────────── */
function Shell({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 400
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[210] bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[211] grid place-items-center px-3 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, x: "-50%", y: 24, scale: 0.97 }}
              animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
              exit={{ opacity: 0, x: "-50%", y: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              style={{ width: `min(${width}px, 100%)`, left: "50%" }}
              className="pointer-events-auto relative glass-strong glass-specular rounded-3xl border border-white/15 shadow-floating overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold tracking-tight text-lg truncate">{title}</h3>
                  {subtitle && (
                    <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="size-8 rounded-full glass-subtle grid place-items-center hover:bg-foreground/5"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="px-5 pb-5">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ─────────────────────────────────────────────────────────────
 * 1. New folder
 * ───────────────────────────────────────────────────────────── */
export function NewFolderDialog({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = React.useState("");
  React.useEffect(() => {
    if (!open) setName("");
  }, [open]);
  const submit = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    onClose();
  };
  return (
    <Shell open={open} onClose={onClose} title="New folder" subtitle="Pick a name — you can rename later">
      <label className="block">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Name</div>
        <div className="relative">
          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="My folder"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="w-full h-11 pl-9 pr-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
          />
        </div>
      </label>
      <Button onClick={submit} disabled={!name.trim()} variant="gradient" className="w-full mt-4">
        Create folder
      </Button>
    </Shell>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 2. Vault password — handles both first-time set AND unlock
 * ───────────────────────────────────────────────────────────── */
export function VaultPasswordDialog({
  open,
  onClose,
  mode,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  /** "set" = first-time password creation, "unlock" = enter existing password. */
  mode: "set" | "unlock";
  onSubmit: (password: string) => boolean | void;
}) {
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPw("");
      setConfirm("");
      setErr(null);
    }
  }, [open]);

  const submit = () => {
    setErr(null);
    if (pw.length < 4) {
      setErr("At least 4 characters please.");
      return;
    }
    if (mode === "set" && pw !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    const ok = onSubmit(pw);
    if (ok === false) {
      setErr("Wrong password. Try again.");
      setPw("");
      return;
    }
    onClose();
  };

  return (
    <Shell
      open={open}
      onClose={onClose}
      title={mode === "set" ? "Lock your vault" : "Unlock vault"}
      subtitle={
        mode === "set"
          ? "Set a password to protect files & folders in your vault."
          : "Enter your vault password to view protected items."
      }
      width={420}
    >
      <div className="flex items-center justify-center mb-4 mt-1">
        <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow">
          {mode === "set" ? (
            <ShieldCheck className="size-7 text-white" />
          ) : (
            <KeyRound className="size-7 text-white" />
          )}
        </div>
      </div>

      <label className="block">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {mode === "set" ? "New password" : "Password"}
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            autoFocus
            placeholder="••••••"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="w-full h-11 pl-9 pr-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
          />
        </div>
      </label>

      {mode === "set" && (
        <label className="block mt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Confirm
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              placeholder="Re-enter"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              className="w-full h-11 pl-9 pr-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
            />
          </div>
        </label>
      )}

      {err && (
        <p className={cn("text-[12px] text-rose-400 mt-3 text-center")}>{err}</p>
      )}

      <Button onClick={submit} variant="gradient" className="w-full mt-5">
        {mode === "set" ? "Lock vault" : "Unlock"}
      </Button>
    </Shell>
  );
}
