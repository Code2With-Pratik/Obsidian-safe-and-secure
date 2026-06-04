"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Folder, Lock, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

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
  const t = useT();
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
          {/* Centering is handled entirely by the grid wrapper — DON'T also
              translate via x:"-50%" / left:50% on the inner card, that
              double-centers and shifts it off to one side. */}
          <div className="fixed inset-0 z-[211] grid place-items-center px-3 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              style={{ width: `min(${width}px, 100%)` }}
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
                  aria-label={t("Close")}
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
  const t = useT();
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
    <Shell open={open} onClose={onClose} title={t("New folder")} subtitle={t("Pick a name — you can rename later")}>
      <label className="block">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("Name")}</div>
        <div className="relative">
          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder={t("My folder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="w-full h-11 pl-9 pr-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
          />
        </div>
      </label>
      <Button onClick={submit} disabled={!name.trim()} variant="gradient" className="w-full mt-4">
        {t("Create folder")}
      </Button>
    </Shell>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 1b. Confirm delete — "are you sure?" before removing selection
 * ───────────────────────────────────────────────────────────── */
export function ConfirmDeleteDialog({
  open,
  count,
  locked = false,
  onClose,
  onConfirm
}: {
  open: boolean;
  /** How many items are about to be removed — shown as a small count line. */
  count: number;
  /** True when the single item being deleted is a locked vault item — shows a
   *  lock-specific message (the password prompt follows on confirm). */
  locked?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  return (
    <Shell open={open} onClose={onClose} title={t("Are you sure?")}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "size-12 shrink-0 rounded-2xl grid place-items-center",
            locked ? "bg-amber-500/15" : "bg-rose-500/15"
          )}
        >
          {locked ? (
            <Lock className="size-5 text-amber-400" />
          ) : (
            <Trash2 className="size-5 text-rose-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {locked
              ? t("This item is locked. Are you sure you want to delete it?")
              : t("The selected files and folders will be permanently deleted. This can't be undone.")}
          </p>
          {count > 1 && (
            <p className="text-xs text-muted-foreground/80 mt-1.5 tabular-nums">
              {count} {t("selected")}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <Button variant="glass" className="flex-1" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          <Trash2 /> {t("Delete")}
        </Button>
      </div>
    </Shell>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 2. Vault password — handles set / unlock / change
 * ───────────────────────────────────────────────────────────── */
export type VaultPwMode = "set" | "unlock" | "change";

export function VaultPasswordDialog({
  open,
  onClose,
  mode,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  /** "set" = first-time creation, "unlock" = enter existing, "change" = old → new. */
  mode: VaultPwMode;
  /** For "set"/"unlock" only the new password is passed. For "change" we
   *  pass `{ current, next }`. Return `false` (sync OR resolved promise)
   *  to keep the dialog open and display "Wrong password". Async returns
   *  are awaited so server-side PIN verification (verify_vault_pin RPC)
   *  can drive the result. */
  onSubmit: (
    payload: string | { current: string; next: string }
  ) => boolean | void | Promise<boolean | void>;
}) {
  const t = useT();
  const [current, setCurrent] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setCurrent("");
      setPw("");
      setConfirm("");
      setErr(null);
    }
  }, [open]);

  const submit = async () => {
    setErr(null);
    if (mode === "change") {
      if (!current) {
        setErr("Enter your current password.");
        return;
      }
      if (pw.length < 4) {
        setErr("New password needs at least 4 characters.");
        return;
      }
      if (pw !== confirm) {
        setErr("New passwords don't match.");
        return;
      }
      const ok = await Promise.resolve(onSubmit({ current, next: pw }));
      if (ok === false) {
        setErr("Current password is wrong.");
        setCurrent("");
        return;
      }
      onClose();
      return;
    }

    if (pw.length < 4) {
      setErr("At least 4 characters please.");
      return;
    }
    if (mode === "set" && pw !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    const ok = await Promise.resolve(onSubmit(pw));
    if (ok === false) {
      setErr("Wrong password. Try again.");
      setPw("");
      return;
    }
    onClose();
  };

  const title =
    mode === "set"
      ? t("Lock your vault")
      : mode === "unlock"
        ? t("Unlock vault")
        : t("Change vault password");
  const subtitle =
    mode === "set"
      ? t("Set a password to protect files & folders in your vault.")
      : mode === "unlock"
        ? t("Enter your vault password to view protected items.")
        : t("Confirm the current password before choosing a new one.");

  return (
    <Shell open={open} onClose={onClose} title={title} subtitle={subtitle} width={420}>
      <div className="flex items-center justify-center mb-4 mt-1">
        <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow">
          {mode === "unlock" ? (
            <KeyRound className="size-7 text-white" />
          ) : (
            <ShieldCheck className="size-7 text-white" />
          )}
        </div>
      </div>

      {mode === "change" && (
        <label className="block">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {t("Current password")}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
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
      )}

      <label className={cn("block", mode === "change" && "mt-3")}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {mode === "unlock" ? t("Password") : t("New password")}
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            autoFocus={mode !== "change"}
            placeholder="••••••"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="w-full h-11 pl-9 pr-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
          />
        </div>
      </label>

      {(mode === "set" || mode === "change") && (
        <label className="block mt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {t("Confirm")}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              placeholder={t("Re-enter")}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              className="w-full h-11 pl-9 pr-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
            />
          </div>
        </label>
      )}

      {err && <p className={cn("text-[12px] text-rose-400 mt-3 text-center")}>{t(err)}</p>}

      <Button onClick={submit} variant="gradient" className="w-full mt-5">
        {mode === "set" ? t("Lock vault") : mode === "unlock" ? t("Unlock") : t("Update password")}
      </Button>
    </Shell>
  );
}
