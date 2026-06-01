"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  Ghost,
  Lock,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Users as UsersIcon,
  Video
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/use-chat-store";
import { useUIStore } from "@/store/use-ui-store";
import { users as allUsers } from "@/lib/mock-data";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Anonymous call. Functionally the same as Start a call but the host's
 *  identity is hidden from invitees — the call surface is branded as
 *  "Ghost call" and the caller appears as a randomized Ghost handle. */
export function GhostCallDialog({ open, onOpenChange }: Props) {
  const t = useT();
  const router = useRouter();
  const startDM = useChatStore((s) => s.startDM);
  const addGroup = useChatStore((s) => s.addGroup);
  const startCall = useUIStore((s) => s.startCall);

  const [q, setQ] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [video, setVideo] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setPicked([]);
      setVideo(false);
    }
  }, [open]);

  const candidates = allUsers
    .filter((u) => u.id !== "me")
    .filter((u) =>
      q.trim() === ""
        ? true
        : u.name.toLowerCase().includes(q.toLowerCase()) ||
          u.username.toLowerCase().includes(q.toLowerCase())
    );

  const toggle = (id: string) =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );

  const handleStart = async () => {
    if (picked.length === 0) return;
    // Fresh ghost handle for this call.
    const ghostHandle = `Ghost#${1000 + Math.floor(Math.random() * 9000)}`;
    if (picked.length === 1) {
      const u = allUsers.find((x) => x.id === picked[0])!;
      const result = await startDM(u);
      const chatId = result.data?.id;
      if (!chatId) return;
      startCall({
        chatId,
        // The invitee sees "Ghost call · <their name>", not the caller.
        name: u.name,
        avatar: u.avatar,
        video,
        group: false,
        participants: 2,
        returnTo: "/calls",
        ghost: true,
        ghostHandle
      });
    } else {
      const pickedUsers = picked
        .map((id) => allUsers.find((u) => u.id === id))
        .filter((u): u is NonNullable<typeof u> => !!u);
      const chat = await addGroup({
        name: "Ghost room",
        description: "Anonymous call",
        memberIds: picked,
        avatar: pickedUsers[0]?.avatar
      });
      startCall({
        chatId: chat.id,
        name: "Ghost call",
        avatar: pickedUsers[0]?.avatar,
        video,
        group: true,
        participants: picked.length + 1,
        returnTo: "/calls",
        ghost: true,
        ghostHandle
      });
    }
    onOpenChange(false);
    router.push("/calls/active");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-md !max-h-[90dvh] !p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow mb-2">
            <Ghost className="text-white" />
          </div>
          <DialogTitle className="text-xl flex items-center gap-2">
            {t("Ghost call")}
            <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-200">
              <Lock className="size-2.5" /> {t("anonymous")}
            </span>
          </DialogTitle>
          <DialogDescription>
            {t("Your identity is hidden. Invitees only see a fresh Ghost handle — and the call is end-to-end encrypted.")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 mt-2 flex items-center gap-1 p-1 rounded-full glass-subtle">
          <button
            onClick={() => setVideo(false)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-medium transition",
              !video ? "bg-foreground text-background" : "text-muted-foreground"
            )}
          >
            <Phone className="size-3.5" /> {t("Voice")}
          </button>
          <button
            onClick={() => setVideo(true)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-medium transition",
              video ? "bg-foreground text-background" : "text-muted-foreground"
            )}
          >
            <Video className="size-3.5" /> {t("Video")}
          </button>
        </div>

        <div className="px-6 mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search anyone — they won't know it's you")}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {picked.length > 0 && (
          <div className="px-6 mt-3 flex flex-wrap gap-1.5">
            {picked
              .map((id) => allUsers.find((u) => u.id === id))
              .filter((u): u is NonNullable<typeof u> => !!u)
              .map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggle(u.id)}
                  className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2 rounded-full bg-violet-500/15 border border-violet-400/40 text-xs text-violet-200 hover:bg-violet-500/25 transition"
                >
                  <Avatar className="size-5">
                    <AvatarImage src={u.avatar} />
                  </Avatar>
                  {u.name.split(" ")[0]}
                </button>
              ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2 mt-3">
          {candidates.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              {t("No people match")} &quot;{q}&quot;
            </p>
          ) : (
            <div className="space-y-0.5">
              {candidates.map((u) => {
                const isPicked = picked.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-left transition",
                      isPicked
                        ? "bg-foreground/[0.06]"
                        : "hover:bg-foreground/[0.04]"
                    )}
                  >
                    <Avatar className="size-10">
                      <AvatarImage src={u.avatar} />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        @{u.username}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "size-6 rounded-full grid place-items-center transition",
                        isPicked
                          ? "bg-cyan-400 text-black"
                          : "bg-foreground/10 text-transparent"
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={4} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-2 border-t border-border/40 bg-violet-500/5 text-[11px] text-violet-200/80 inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-violet-300" />
          {t("You'll appear as a fresh Ghost handle. Disappears when the call ends.")}
        </div>

        <DialogFooter className="!justify-between px-6 py-4 border-t border-border/40 bg-background/30 backdrop-blur-md">
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <UsersIcon className="size-3" />
            {picked.length === 0
              ? t("No one selected")
              : picked.length === 1
                ? t("1 person")
                : `${picked.length} ${t("people · group ghost call")}`}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                variant="gradient"
                onClick={handleStart}
                disabled={picked.length === 0}
              >
                <Sparkles /> {t("Ring anonymously")}
              </Button>
            </motion.div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
