"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Camera,
  Search,
  MapPin,
  Navigation,
  Plus,
  Trash2,
  CalendarClock,
  ArrowUp,
  RotateCcw,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { users } from "@/lib/mock-data";
import { useT } from "@/lib/i18n";
import { initials, cn } from "@/lib/utils";

/** Shared modal scaffold — backdrop, glass card, close button. */
function DialogShell({
  open,
  onClose,
  title,
  subtitle,
  width = 480,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: React.ReactNode;
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
          {/* Centering container — keeps the dialog visually centred while
              framer-motion's transform animations (y / scale) live on the
              card itself without fighting Tailwind's centring classes. */}
          <div className="fixed inset-0 z-[211] grid place-items-center px-3 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              style={{ width: `min(${width}px, 100%)` }}
              className="pointer-events-auto glass-strong glass-specular rounded-3xl border border-white/15 shadow-floating overflow-hidden flex flex-col max-h-[88vh]"
            >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <div className="min-w-0">
                <h3 className="font-display font-semibold tracking-tight text-lg truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="size-8 rounded-full glass-subtle grid place-items-center hover:bg-foreground/5 shrink-0"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pt-1 pb-5">
              {children}
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ──────────────────────── 1. CAMERA CAPTURE ──────────────────────── */

export function CameraCaptureDialog({
  open,
  onClose,
  onCapture
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [facing, setFacing] = React.useState<"user" | "environment">("user");
  const [shot, setShot] = React.useState<string | null>(null); // captured preview before send
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const t = useT();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) {
      setShot(null);
      return;
    }
    let cancelled = false;
    setReady(false);
    setError(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Couldn't open camera.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setReady(false);
    };
  }, [open, facing]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror selfie shots to match the live preview
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setShot(canvas.toDataURL("image/jpeg", 0.9));
  };

  const send = () => {
    if (!shot) return;
    onCapture(shot);
    onClose();
  };

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
            className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-md md:bg-black/40"
          />
          {/* Same centring container pattern as DialogShell — keeps the
              motion transform from clobbering layout transforms. */}
          <div
            className={cn(
              "fixed z-[211] pointer-events-none",
              isDesktop ? "inset-0 grid place-items-center px-4" : "inset-0"
            )}
          >
            <motion.div
              initial={isDesktop ? { opacity: 0, scale: 0.96 } : { opacity: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={isDesktop ? { opacity: 0, scale: 0.96 } : { opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className={cn(
                "pointer-events-auto bg-black overflow-hidden flex flex-col",
                isDesktop
                  ? "w-[min(640px,100%)] rounded-3xl ring-1 ring-white/15 shadow-floating"
                  : "w-full h-full"
              )}
            >
            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
              <button
                onClick={onClose}
                className="size-10 rounded-full bg-black/50 backdrop-blur grid place-items-center text-white hover:bg-black/70"
                aria-label="Close camera"
              >
                <X className="size-5" />
              </button>
              <span className="text-white/90 text-sm font-medium tracking-wide">
                {shot ? t("Preview") : t("Camera")}
              </span>
              <button
                onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                className="size-10 rounded-full bg-black/50 backdrop-blur grid place-items-center text-white hover:bg-black/70"
                aria-label="Flip camera"
              >
                <RotateCcw className="size-5" />
              </button>
            </div>

            {/* Stage — live video OR captured still */}
            <div className={cn(
              "relative flex-1 min-h-0 overflow-hidden",
              isDesktop ? "aspect-[4/3]" : ""
            )}>
              {shot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shot} alt="" className="absolute inset-0 w-full h-full object-contain bg-black" />
              ) : (
                <>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover",
                      facing === "user" && "scale-x-[-1]"
                    )}
                  />
                  {!ready && !error && (
                    <div className="absolute inset-0 grid place-items-center text-white/70 text-sm">
                      {t("Starting camera…")}
                    </div>
                  )}
                  {error && (
                    <div className="absolute inset-0 grid place-items-center text-white/80 text-sm text-center px-8">
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom controls */}
            <div className="relative z-10 px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-8">
              {shot ? (
                <>
                  <button
                    onClick={() => setShot(null)}
                    className="size-12 rounded-full bg-black/55 backdrop-blur grid place-items-center text-white hover:bg-black/70 ring-1 ring-white/15"
                    aria-label="Retake"
                  >
                    <RotateCcw className="size-5" />
                  </button>
                  <button
                    onClick={send}
                    className="size-16 rounded-full grid place-items-center bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-white shadow-[0_8px_24px_-4px_rgba(34,211,238,0.7)] active:scale-95 transition"
                    aria-label="Send"
                  >
                    <Check className="size-7" strokeWidth={3} />
                  </button>
                  <div className="size-12" />
                </>
              ) : (
                <>
                  <div className="size-12" />
                  <button
                    onClick={capture}
                    disabled={!ready}
                    className="size-16 rounded-full grid place-items-center bg-white ring-4 ring-white/30 disabled:opacity-40 active:scale-95 transition"
                    aria-label="Capture"
                  >
                    <span className="size-12 rounded-full bg-white" />
                  </button>
                  <div className="size-12" />
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

/* ──────────────────────── 2. CONTACT PICKER ──────────────────────── */

export function ContactPickerDialog({
  open,
  onClose,
  onPick
}: {
  open: boolean;
  onClose: () => void;
  onPick: (contacts: { name: string; username: string; avatar?: string }[]) => void;
}) {
  const t = useT();
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setSelected(new Set());
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users
      .filter((u) => u.id !== "me")
      .filter(
        (u) =>
          !needle ||
          u.name.toLowerCase().includes(needle) ||
          u.username.toLowerCase().includes(needle)
      );
  }, [q]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = () => {
    if (selected.size === 0) return;
    const picked = users
      .filter((u) => selected.has(u.id))
      .map((u) => ({ name: u.name, username: u.username, avatar: u.avatar }));
    onPick(picked);
    onClose();
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={t("Share contacts")}
      subtitle={
        selected.size > 0
          ? `${selected.size} ${t("selected")}`
          : t("Tap to pick — multi-select supported")
      }
    >
      <div className="relative mt-2 mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Search contacts")}
          autoFocus
          className="w-full h-10 pl-9 pr-3 rounded-full glass border border-border/60 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-cyan-400/60"
        />
      </div>
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {t("No matches")} · &quot;{q}&quot;
          </p>
        ) : (
          filtered.map((u) => {
            const isSelected = selected.has(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggle(u.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-xl transition text-left",
                  isSelected ? "bg-cyan-400/15 ring-1 ring-cyan-400/50" : "hover:bg-foreground/5"
                )}
              >
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={u.avatar} />
                  <AvatarFallback>{initials(u.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    @{u.username}
                  </p>
                </div>
                <span
                  className={cn(
                    "size-6 rounded-full grid place-items-center text-[10px] font-bold transition shrink-0",
                    isSelected
                      ? "bg-cyan-400 text-black"
                      : "bg-foreground/10 text-transparent ring-1 ring-border/60"
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              </button>
            );
          })
        )}
      </div>
      <Button
        onClick={send}
        disabled={selected.size === 0}
        variant="gradient"
        className="w-full mt-4 sticky bottom-0"
      >
        {t("Share")} {selected.size > 0 ? `${selected.size} ` : ""}
        {selected.size === 1 ? t("contact") : t("contacts")}
      </Button>
    </DialogShell>
  );
}

/* ──────────────────────── 3. LOCATION PICKER ──────────────────────── */

export function LocationPickerDialog({
  open,
  onClose,
  onPick
}: {
  open: boolean;
  onClose: () => void;
  onPick: (loc: { lat: number; lng: number; live: boolean }) => void;
}) {
  const t = useT();
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCoords(null);
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Geolocation isn't available in this browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Couldn't fetch location.");
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    );
  }, [open]);

  const mapSrc =
    coords &&
    `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={t("Share location")}
      subtitle={
        loading
          ? t("Finding your location…")
          : coords
            ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
            : t("Allow location access to continue")
      }
    >
      <div className="aspect-[5/4] rounded-2xl overflow-hidden ring-1 ring-border/60 bg-foreground/[0.04] relative">
        {mapSrc ? (
          <iframe
            title="map preview"
            src={mapSrc}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground text-center px-6">
            {error ?? t("Locating you…")}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button
          variant="glass"
          onClick={() => coords && (onPick({ ...coords, live: true }), onClose())}
          disabled={!coords}
        >
          <Navigation className="size-4" />
          {t("Live location")}
        </Button>
        <Button
          variant="gradient"
          onClick={() => coords && (onPick({ ...coords, live: false }), onClose())}
          disabled={!coords}
        >
          <MapPin className="size-4" />
          {t("Send current")}
        </Button>
      </div>
    </DialogShell>
  );
}

/* ──────────────────────── 4. SCHEDULE MESSAGE ──────────────────────── */

export function ScheduleMessageDialog({
  open,
  onClose,
  onSchedule
}: {
  open: boolean;
  onClose: () => void;
  onSchedule: (when: Date, message: string) => void;
}) {
  const t = useT();
  const initial = React.useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d;
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  // Both `date` and `time` must be expressed in LOCAL time — submit parses
  // `new Date(\`${date}T${time}\`)` as local, so mixing a UTC date with a local
  // time produces a phantom past timestamp for users whose local date ≠ UTC
  // date (i.e. near midnight east/west of UTC).
  const [date, setDate] = React.useState(
    `${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`
  );
  const [time, setTime] = React.useState(
    `${pad(initial.getHours())}:${pad(initial.getMinutes())}`
  );
  const [msg, setMsg] = React.useState("");

  const submit = () => {
    if (!msg.trim()) return;
    const when = new Date(`${date}T${time}`);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) return;
    onSchedule(when, msg.trim());
    onClose();
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={t("Schedule message")}
      subtitle={t("Pick when this should send")}
    >
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder={t("Type the message to schedule…")}
        rows={3}
        autoFocus
        className="w-full rounded-2xl glass-subtle px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-cyan-400/60"
      />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Date")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={(() => {
              const n = new Date();
              return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
            })()}
            className="h-10 px-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Time")}</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-10 px-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
          />
        </label>
      </div>
      <Button onClick={submit} disabled={!msg.trim()} variant="gradient" className="w-full mt-4">
        <CalendarClock className="size-4" />
        {t("Schedule for")} {date} {time}
      </Button>
    </DialogShell>
  );
}

/* ──────────────────────── 5. POLL CREATOR ──────────────────────── */

export function PollCreatorDialog({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (poll: {
    question: string;
    imageUrl?: string;
    options: string[];
    multi: boolean;
  }) => void;
}) {
  const t = useT();
  const [question, setQuestion] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | undefined>();
  const [options, setOptions] = React.useState<string[]>(["", ""]);
  const [multi, setMulti] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setQuestion("");
      setImageUrl(undefined);
      setOptions(["", ""]);
      setMulti(false);
    }
  }, [open]);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    // Tiny inline data URL so the poll can be drafted offline. Stored on the
    // poll row inside the message payload JSON.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageUrl(reader.result);
    };
    reader.readAsDataURL(f);
  };

  const setOption = (i: number, v: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  const removeOption = (i: number) =>
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  const addOption = () => setOptions((prev) => (prev.length < 6 ? [...prev, ""] : prev));

  const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
  const canCreate = question.trim().length > 0 && cleanOpts.length >= 2;

  const submit = () => {
    if (!canCreate) return;
    onCreate({
      question: question.trim(),
      imageUrl,
      options: cleanOpts,
      multi
    });
    onClose();
  };

  return (
    <DialogShell open={open} onClose={onClose} title={t("Create poll")} subtitle={t("Ask a question, get answers")}>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
      {/* Optional image above the question. */}
      <div className="mb-3">
        {imageUrl ? (
          <div className="relative h-32 w-full overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl(undefined)}
              className="absolute right-1.5 top-1.5 size-7 grid place-items-center rounded-full bg-black/55 text-white hover:bg-black/75"
              aria-label={t("Remove image")}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-xl glass-subtle text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          >
            <Plus className="size-4" />
            {t("Add image (optional)")}
          </button>
        )}
      </div>
      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Question")}</span>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          autoFocus
          placeholder={t("What's the plan tonight?")}
          className="mt-1 w-full h-11 px-3.5 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
        />
      </label>
      <div className="mt-4">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Options")}</span>
        <div className="space-y-2 mt-1">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`${t("Option")} ${i + 1}`}
                className="flex-1 h-10 px-3 rounded-xl glass-subtle bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(i)}
                  className="size-9 rounded-lg grid place-items-center text-rose-400 hover:bg-rose-400/10"
                  aria-label="Remove option"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button
              onClick={addOption}
              className="w-full h-10 rounded-xl glass-subtle text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="size-3.5" />
              {t("Add option")}
            </button>
          )}
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={multi}
          onChange={(e) => setMulti(e.target.checked)}
          className="size-4 rounded accent-cyan-400"
        />
        {t("Allow multiple answers")}
      </label>
      <Button onClick={submit} disabled={!canCreate} variant="gradient" className="w-full mt-5">
        <ArrowUp className="size-4" />
        {t("Create poll")}
      </Button>
    </DialogShell>
  );
}
