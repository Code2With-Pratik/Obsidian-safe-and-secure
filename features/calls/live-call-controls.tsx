"use client";

import * as React from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { CallControls } from "./call-controls";
import { useCallDataChannel, type CallDataMessage } from "./use-call-data-channel";
import { InCallChatPanel, type InCallChatMessage } from "./in-call-chat-panel";
import { InviteToCallPopup } from "./invite-to-call-popup";
import { ParticipantsPanel } from "./participants-panel";

/**
 * Thin bridge that wires `<CallControls>` to the LiveKit local participant.
 * Must be rendered INSIDE a `<LiveKitRoom>` so the hooks have room context.
 *
 * Also owns the in-call ephemeral state: raise-hand map, chat message log,
 * unread chat count, and the open/closed flags for the chat panel + invite
 * popup. All cross-participant sync happens via LiveKit's data channel.
 */
export function LiveCallControls({
  onEnd,
  filterId,
  onFilterChange,
  sessionId,
  onRaisedHandsChange
}: {
  onEnd?: () => void;
  filterId?: string;
  onFilterChange?: (id: string) => void;
  /** Live session id — needed by the invite popup. */
  sessionId?: string | null;
  /** Pushed up to the stage so it can render the ✋ badge on tiles + the
   *  floating "N hands raised" chip. */
  onRaisedHandsChange?: (map: Record<string, boolean>) => void;
}) {
  const { localParticipant } = useLocalParticipant();

  // ─── Media-track mirrors (mic / camera / screen-share) ─────────────────
  const micPub = localParticipant?.getTrackPublication(Track.Source.Microphone);
  const camPub = localParticipant?.getTrackPublication(Track.Source.Camera);
  const screenPub = localParticipant?.getTrackPublication(Track.Source.ScreenShare);

  const [muted, setMuted] = React.useState(() => micPub?.isMuted ?? false);
  const [camOff, setCamOff] = React.useState(() => !camPub || camPub.isMuted);
  const [share, setShare] = React.useState(() => !!screenPub && !screenPub.isMuted);

  React.useEffect(() => {
    if (!localParticipant) return;
    const sync = () => {
      const mic = localParticipant.getTrackPublication(Track.Source.Microphone);
      const cam = localParticipant.getTrackPublication(Track.Source.Camera);
      const scr = localParticipant.getTrackPublication(Track.Source.ScreenShare);
      setMuted(mic?.isMuted ?? false);
      setCamOff(!cam || cam.isMuted);
      setShare(!!scr && !scr.isMuted);
    };
    localParticipant.on("trackMuted", sync);
    localParticipant.on("trackUnmuted", sync);
    localParticipant.on("trackPublished", sync);
    localParticipant.on("trackUnpublished", sync);
    return () => {
      localParticipant.off("trackMuted", sync);
      localParticipant.off("trackUnmuted", sync);
      localParticipant.off("trackPublished", sync);
      localParticipant.off("trackUnpublished", sync);
    };
  }, [localParticipant]);

  // ─── Cross-participant state via LiveKit data channel ──────────────────
  const [raisedHands, setRaisedHands] = React.useState<Record<string, boolean>>(
    {}
  );
  const [chatMessages, setChatMessages] = React.useState<InCallChatMessage[]>(
    []
  );
  const [chatOpen, setChatOpen] = React.useState(false);
  const [participantsOpen, setParticipantsOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [unreadChat, setUnreadChat] = React.useState(0);

  // Mutually exclusive sliding panels — opening one auto-closes the other
  // so they never stack and fight for the same viewport edge.
  const openChat = () =>
    setChatOpen((v) => {
      const next = !v;
      if (next) setParticipantsOpen(false);
      return next;
    });
  const openParticipants = () =>
    setParticipantsOpen((v) => {
      const next = !v;
      if (next) setChatOpen(false);
      return next;
    });

  React.useEffect(() => {
    onRaisedHandsChange?.(raisedHands);
  }, [raisedHands, onRaisedHandsChange]);

  // Clear unread when the panel opens.
  React.useEffect(() => {
    if (chatOpen) setUnreadChat(0);
  }, [chatOpen]);

  const localIdentity = localParticipant?.identity ?? "me";
  const localName = localParticipant?.name || "You";

  // Brief "Alice: 👋" preview shown when the chat panel is closed so the
  // recipient gets immediate visual feedback in addition to the chat-icon
  // badge. Auto-clears after a few seconds.
  const [chatToast, setChatToast] = React.useState<{
    id: string;
    authorName: string;
    preview: string;
  } | null>(null);
  const chatToastTimerRef = React.useRef<number | null>(null);

  const handleRecv = React.useCallback(
    (msg: CallDataMessage, from: string) => {
      if (msg.kind === "hand") {
        setRaisedHands((prev) => ({ ...prev, [msg.from]: msg.raised }));
      } else if (msg.kind === "chat") {
        setChatMessages((prev) => [
          ...prev,
          {
            id: msg.id,
            authorIdentity: msg.from,
            authorName: msg.authorName,
            authorAvatar: msg.authorAvatar,
            createdAt: msg.createdAt,
            text: msg.text,
            sticker: msg.sticker,
            gif: msg.gif,
            meme: msg.meme,
            byMe: from === localIdentity
          }
        ]);
        if (!chatOpen) {
          setUnreadChat((n) => n + 1);
          // Flash a quick preview toast above the controls.
          const preview = msg.text
            ? msg.text.length > 60
              ? msg.text.slice(0, 60) + "…"
              : msg.text
            : msg.sticker
            ? "sent a sticker"
            : msg.gif
            ? "sent a GIF"
            : msg.meme
            ? "sent a meme"
            : "";
          setChatToast({ id: msg.id, authorName: msg.authorName, preview });
          if (chatToastTimerRef.current) {
            window.clearTimeout(chatToastTimerRef.current);
          }
          chatToastTimerRef.current = window.setTimeout(() => {
            setChatToast(null);
            chatToastTimerRef.current = null;
          }, 3500);
        }
      }
    },
    [chatOpen, localIdentity]
  );

  // Cleanup the toast timer on unmount so we don't try to setState on a
  // ghost component after the call ends.
  React.useEffect(() => {
    return () => {
      if (chatToastTimerRef.current) {
        window.clearTimeout(chatToastTimerRef.current);
      }
    };
  }, []);

  const send = useCallDataChannel(handleRecv);

  // ─── Media-toggle callbacks ────────────────────────────────────────────
  const onMutedChange = React.useCallback(
    async (next: boolean) => {
      if (!localParticipant) return;
      try {
        await localParticipant.setMicrophoneEnabled(!next);
      } catch (err) {
        console.warn("[LiveCallControls] mic toggle failed:", err);
      }
    },
    [localParticipant]
  );

  const onCamOffChange = React.useCallback(
    async (next: boolean) => {
      if (!localParticipant) return;
      try {
        await localParticipant.setCameraEnabled(!next);
      } catch (err) {
        console.warn("[LiveCallControls] camera toggle failed:", err);
      }
    },
    [localParticipant]
  );

  const onShareChange = React.useCallback(
    async (next: boolean) => {
      if (!localParticipant) return;
      try {
        await localParticipant.setScreenShareEnabled(next);
      } catch (err) {
        console.warn("[LiveCallControls] screenshare toggle failed:", err);
      }
    },
    [localParticipant]
  );

  // ─── Raise hand ────────────────────────────────────────────────────────
  const handRaised = !!raisedHands[localIdentity];
  const toggleHand = React.useCallback(() => {
    const next = !handRaised;
    setRaisedHands((prev) => ({ ...prev, [localIdentity]: next }));
    send({ kind: "hand", from: localIdentity, raised: next });
  }, [handRaised, localIdentity, send]);

  // ─── In-call chat send ────────────────────────────────────────────────
  const onChatSend = React.useCallback(
    (msg: Extract<CallDataMessage, { kind: "chat" }>) => {
      // Optimistic — show our own send immediately.
      setChatMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          authorIdentity: localIdentity,
          authorName: msg.authorName,
          authorAvatar: msg.authorAvatar,
          createdAt: msg.createdAt,
          text: msg.text,
          sticker: msg.sticker,
          gif: msg.gif,
          meme: msg.meme,
          byMe: true
        }
      ]);
      send(msg);
    },
    [localIdentity, send]
  );

  return (
    <>
      {/* Inbound chat preview — only visible when the chat panel is closed.
          Sits just above the control bar, fades after ~3.5s. The unread
          badge on the Chat button stays until the panel is opened. */}
      {chatToast && !chatOpen && (
        <button
          key={chatToast.id}
          onClick={openChat}
          className="absolute left-1/2 -translate-x-1/2 bottom-[5.5rem] z-20 max-w-[min(20rem,calc(100vw-2rem))] px-3 py-2 rounded-full glass-strong border border-border/60 shadow-floating text-left flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"
        >
          <span className="size-6 rounded-full bg-cyan-500/20 text-cyan-300 grid place-items-center text-[10px] font-bold shrink-0">
            {chatToast.authorName.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-xs min-w-0 truncate">
            <span className="font-semibold">{chatToast.authorName}</span>
            {chatToast.preview ? `: ${chatToast.preview}` : ""}
          </span>
        </button>
      )}

      <CallControls
        onEnd={onEnd}
        filterId={filterId}
        onFilterChange={onFilterChange}
        muted={muted}
        onMutedChange={onMutedChange}
        camOff={camOff}
        onCamOffChange={onCamOffChange}
        share={share}
        onShareChange={onShareChange}
        handRaised={handRaised}
        onHandToggle={toggleHand}
        chatOpen={chatOpen}
        onChatToggle={openChat}
        unreadChat={unreadChat}
        participantsOpen={participantsOpen}
        onParticipantsToggle={openParticipants}
        onMore={() => setInviteOpen(true)}
      />

      <InCallChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onSend={onChatSend}
        me={{
          identity: localIdentity,
          name: localName,
          avatar: undefined
        }}
      />

      <ParticipantsPanel
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        raisedHands={raisedHands}
        localIdentity={localIdentity}
        onInvite={() => setInviteOpen(true)}
      />

      <InviteToCallPopup
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        sessionId={sessionId ?? null}
      />
    </>
  );
}

export type { CallDataMessage };
