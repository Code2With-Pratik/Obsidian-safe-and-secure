"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, Phone, PhoneOff, Video } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCallStore, type IncomingCall } from "@/store/use-call-store";
import { useUIStore } from "@/store/use-ui-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Full-bleed ringing modal — appears whenever `useCallStore.incoming` is set.
 * Accept → POST /api/calls/accept, hydrate `activeCall`, route to /calls/active.
 * Decline → POST /api/calls/decline and clear the incoming state.
 */
export function IncomingCallModal() {
  const incoming = useCallStore((s) => s.incoming);
  const accept = useCallStore((s) => s.accept);
  const decline = useCallStore((s) => s.decline);
  const watchSession = useCallStore((s) => s.watchSession);
  const setOutgoing = useCallStore((s) => s.setOutgoing);
  const startCall = useUIStore((s) => s.startCall);
  const router = useRouter();
  const t = useT();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Subscribe to the session channel as soon as we have an incoming ring so
  // we hear `call:ended` (caller hung up before we picked) and auto-dismiss.
  React.useEffect(() => {
    if (!incoming) return;
    watchSession(incoming.sessionId);
  }, [incoming, watchSession]);

  // Ringtone — looped while the modal is open. Browsers gate autoplay on
  // user interaction; if `.play()` is rejected we swallow it silently so the
  // modal still works (just without sound until the user has interacted with
  // the page once).
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  React.useEffect(() => {
    if (!incoming) return;
    if (typeof Audio === "undefined") return;
    const el = new Audio("/aarmin.mp3");
    el.loop = true;
    el.volume = 0.85;
    audioRef.current = el;
    el.play().catch(() => {
      /* autoplay blocked — no-op, accept/decline still works */
    });
    return () => {
      el.pause();
      el.currentTime = 0;
      audioRef.current = null;
    };
  }, [incoming]);

  if (!mounted || !incoming || typeof document === "undefined") return null;

  const onAccept = async () => {
    const snapshot: IncomingCall = incoming;
    await accept(snapshot.sessionId);
    setOutgoing({
      sessionId: snapshot.sessionId,
      chatId: snapshot.chatId,
      roomName: snapshot.roomName,
      kind: snapshot.kind
    });
    // Hydrate the legacy ActiveCall state so /calls/active renders the
    // existing chrome (timer, top bar, mini-call return-to).
    startCall({
      chatId: snapshot.chatId,
      name: snapshot.isGhost ? "Ghost call" : snapshot.initiator.name,
      avatar: snapshot.initiator.avatar ?? undefined,
      video: snapshot.kind === "video",
      group: snapshot.isGroup,
      ghost: snapshot.isGhost,
      returnTo: `/chats/${snapshot.chatId}`
    });
    router.push("/calls/active");
  };

  const onDecline = async () => {
    await decline(incoming.sessionId);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={incoming.sessionId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="relative w-full max-w-sm rounded-3xl glass-strong glass-specular border border-border/60 p-6 text-center shadow-floating overflow-hidden"
        >
          {/* Ambient pulse behind the avatar */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 size-56 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                incoming.kind === "video"
                  ? "radial-gradient(50% 50% at 50% 50%, rgba(167,139,250,0.45), transparent 70%)"
                  : "radial-gradient(50% 50% at 50% 50%, rgba(34,211,238,0.40), transparent 70%)"
            }}
          />

          <div className="relative text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {incoming.isGhost ? t("Ghost call") : t("Incoming call")}
          </div>

          <div className="relative mt-5 grid place-items-center">
            <RingingAvatar
              avatar={incoming.initiator.avatar}
              name={incoming.initiator.name}
              ghost={incoming.isGhost}
            />
          </div>

          <h2 className="relative mt-4 text-xl font-display font-semibold tracking-tight">
            {incoming.isGhost ? "Ghost" : incoming.initiator.name}
          </h2>
          <p className="relative text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
            {incoming.kind === "video" ? (
              <>
                <Video className="size-3" /> {t("Video call")}
              </>
            ) : (
              <>
                <Phone className="size-3" /> {t("Voice call")}
              </>
            )}
            {incoming.isGroup && <span>· {t("Group")}</span>}
          </p>

          <div className="relative mt-7 flex items-center justify-center gap-10">
            <button
              onClick={onDecline}
              aria-label={t("Decline")}
              className="group flex flex-col items-center gap-1.5"
            >
              <span className="size-14 rounded-full bg-rose-500 hover:bg-rose-600 grid place-items-center text-white shadow-glow-pink transition active:scale-95">
                <PhoneOff className="size-6" />
              </span>
              <span className="text-[11px] text-muted-foreground">{t("Decline")}</span>
            </button>
            <button
              onClick={onAccept}
              aria-label={t("Accept")}
              className="group flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "size-14 rounded-full grid place-items-center text-white shadow-glow transition active:scale-95",
                  incoming.kind === "video"
                    ? "bg-violet-500 hover:bg-violet-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                )}
              >
                {incoming.kind === "video" ? <Video className="size-6" /> : <Phone className="size-6" />}
              </span>
              <span className="text-[11px] text-muted-foreground">{t("Accept")}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function RingingAvatar({
  avatar,
  name,
  ghost
}: {
  avatar: string | null;
  name: string;
  ghost: boolean;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute inset-0 -m-3 rounded-full border border-cyan-400/40 animate-ping"
      />
      <span
        aria-hidden
        className="absolute inset-0 -m-6 rounded-full border border-violet-400/30 animate-ping [animation-delay:200ms]"
      />
      <Avatar className="size-24 ring-2 ring-border/60">
        {ghost ? (
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <Ghost className="size-9" />
          </AvatarFallback>
        ) : avatar ? (
          <AvatarImage src={avatar} alt={name} />
        ) : (
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>
    </div>
  );
}
