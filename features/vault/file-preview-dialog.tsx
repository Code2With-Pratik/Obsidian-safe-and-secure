"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  ChevronLeft,
  ChevronRight,
  Lock,
  KeyRound
} from "lucide-react";
import { useVaultStore, type VaultNode } from "@/store/use-vault-store";

/** Centered preview modal for files in the vault. Accepts a list so the
 *  user can swipe / arrow-key through every file in the current view.
 *
 *  Per-kind rendering:
 *    - image  → <img>
 *    - video  → <video controls> (NOT muted/autoplay — clicking ▶ plays with sound)
 *    - audio  → <audio controls>
 *    - PDF    → <iframe> (browser's built-in PDF viewer)
 *    - other  → big icon + filename + download link
 */
export function FilePreviewDialog({
  items,
  startIndex,
  onClose
}: {
  /** All files in the current view — used for prev/next navigation. */
  items: VaultNode[];
  /** Index of the file the user clicked; null = dialog closed. */
  startIndex: number | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => setMounted(true), []);

  // Vault state — a file flagged `vault` stays hidden until the vault is
  // unlocked, even mid-navigation inside this dialog.
  const unlocked = useVaultStore((s) => s.unlocked);

  // Whenever the dialog opens, jump to the clicked file.
  React.useEffect(() => {
    if (startIndex == null) return;
    setIndex(Math.max(0, Math.min(startIndex, items.length - 1)));
  }, [startIndex, items.length]);

  const open = startIndex != null && items.length > 0;
  const node = items[index] ?? null;
  const count = items.length;
  const hasNav = count > 1;
  // A locked node is one flagged for the vault while the vault is locked.
  const locked = !!node?.vault && !unlocked;

  const prev = React.useCallback(
    () => setIndex((i) => (count === 0 ? 0 : (i - 1 + count) % count)),
    [count]
  );
  const next = React.useCallback(
    () => setIndex((i) => (count === 0 ? 0 : (i + 1) % count)),
    [count]
  );

  // Keyboard nav while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasNav) prev();
      else if (e.key === "ArrowRight" && hasNav) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasNav, prev, next, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && node && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[301] grid place-items-center p-3 md:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="pointer-events-auto relative w-full max-w-[min(64rem,100%)] max-h-[88dvh] rounded-3xl overflow-hidden glass-strong glass-specular border border-white/15 shadow-floating flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 shrink-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    {locked && <Lock className="size-3.5 text-amber-400 shrink-0" />}
                    {locked ? "Locked file" : node.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {locked
                      ? "Protected — enter your vault password to view"
                      : `${node.mime || node.fileKind}${node.size ? ` · ${formatBytes(node.size)}` : ""}`}
                    {hasNav && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="tabular-nums">
                          {index + 1} / {count}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Download / open-in-tab are hidden while locked so a
                      protected file can't be exfiltrated without the password. */}
                  {node.url && !locked && (
                    <a
                      href={node.url}
                      download={node.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-9 rounded-full glass-subtle grid place-items-center hover:bg-foreground/10"
                      title="Download"
                    >
                      <Download className="size-4" />
                    </a>
                  )}
                  {node.url && !locked && (
                    <a
                      href={node.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-9 rounded-full glass-subtle grid place-items-center hover:bg-foreground/10"
                      title="Open in new tab"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="size-9 rounded-full glass-subtle grid place-items-center hover:bg-foreground/10"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="relative flex-1 min-h-0 overflow-hidden bg-black/20 grid place-items-center">
                {/* `key` on the stage so swapping items remounts the
                    <video>/<audio> element instead of mid-play state leaking.
                    Locked vault files show an unlock prompt instead of content
                    — so scrolling onto a locked neighbour never reveals it. */}
                {locked ? (
                  <LockedStage key={node.id} />
                ) : (
                  <PreviewStage key={node.id} node={node} />
                )}

                {/* Prev / Next chevrons — only when there's more than one item */}
                {hasNav && (
                  <>
                    <button
                      onClick={prev}
                      className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/55 backdrop-blur grid place-items-center text-white hover:bg-black/75 transition"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      onClick={next}
                      className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/55 backdrop-blur grid place-items-center text-white hover:bg-black/75 transition"
                      aria-label="Next"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Shown in place of the content when the current file belongs to a locked
 *  vault. Has an inline password field so the user can unlock right here —
 *  on success the parent re-renders (it reads `unlocked` from the store) and
 *  swaps in the real preview. Self-contained so it works above the preview's
 *  high z-index without fighting the page's password modal. */
function LockedStage() {
  const unlock = useVaultStore((s) => s.unlock);
  const hasPassword = useVaultStore((s) => s.password != null);
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState(false);

  const submit = () => {
    if (!pw) return;
    const ok = unlock(pw);
    if (!ok) {
      setErr(true);
      setPw("");
    }
    // On success there's nothing else to do — the store flips `unlocked`,
    // the dialog re-renders and shows the file.
  };

  return (
    <div className="grid place-items-center gap-4 text-center px-6 py-12 max-w-sm">
      <div className="size-20 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow">
        <Lock className="size-9 text-white" />
      </div>
      <div>
        <p className="text-base font-semibold">This file is in your vault</p>
        <p className="text-[12px] text-muted-foreground mt-1">
          {hasPassword
            ? "Enter your vault password to preview it."
            : "Set a vault password from the Files page first."}
        </p>
      </div>
      {hasPassword && (
        <div className="w-full max-w-[260px]">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="password"
              value={pw}
              autoFocus
              placeholder="Vault password"
              onChange={(e) => {
                setPw(e.target.value);
                setErr(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              className="w-full h-11 pl-9 pr-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
            />
          </div>
          {err && (
            <p className="text-[12px] text-rose-400 mt-2">Wrong password. Try again.</p>
          )}
          <button
            onClick={submit}
            className="mt-3 w-full h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-sm font-medium shadow-glow hover:brightness-110 transition"
          >
            Unlock
          </button>
        </div>
      )}
    </div>
  );
}

/** Renders the appropriate inline preview for a single node. */
function PreviewStage({ node }: { node: VaultNode }) {
  const url = node.url ?? "";
  const kind = node.fileKind ?? "other";
  const isPdf =
    node.mime === "application/pdf" || node.name.toLowerCase().endsWith(".pdf");

  if (kind === "image" && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={node.name}
        className="max-w-full max-h-[78dvh] object-contain"
        draggable={false}
      />
    );
  }

  if (kind === "video" && url) {
    // No autoplay — chrome blocks unmuted autoplay and the user wants
    // sound. They press ▶ to play; audio works on the first user gesture.
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="max-w-full max-h-[78dvh] bg-black"
      />
    );
  }

  if (kind === "audio" && url) {
    return (
      <div className="w-full max-w-md px-6 py-10 grid place-items-center gap-4 text-center">
        <div className="size-24 rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center shadow-glow">
          <span className="text-4xl">🎵</span>
        </div>
        <p className="text-sm font-medium truncate w-full">{node.name}</p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio src={url} controls preload="metadata" className="w-full" />
      </div>
    );
  }

  if (isPdf && url) {
    return (
      <iframe
        title={node.name}
        src={url}
        className="w-full h-[78dvh] border-0 bg-white"
      />
    );
  }

  return (
    <div className="grid place-items-center gap-4 text-center px-6 py-12">
      <div className="size-20 rounded-3xl bg-foreground/10 grid place-items-center">
        <FileText className="size-9 text-foreground/70" />
      </div>
      <div>
        <p className="text-sm font-medium">{node.name}</p>
        <p className="text-[11px] text-muted-foreground">
          Preview not supported for this file type
        </p>
      </div>
      {url && (
        <a
          href={url}
          download={node.name}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-sm font-medium shadow-glow"
        >
          <Download className="size-4" /> Download
        </a>
      )}
    </div>
  );
}

function formatBytes(b: number) {
  if (b > 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b > 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b > 1e3) return (b / 1e3).toFixed(0) + " KB";
  return b + " B";
}
