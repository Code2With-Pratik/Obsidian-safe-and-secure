"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Image as ImageIcon,
  Search,
  Sparkles,
  Users,
  Check,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useChatStore } from "@/store/use-chat-store";
import { useAuthStore } from "@/store/use-auth-store";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface DirectoryUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

const GRADIENTS = [
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#22D3EE,#3B82F6)",
  "linear-gradient(135deg,#A3E635,#22D3EE)",
  "linear-gradient(135deg,#FBBF24,#EC4899)",
  "linear-gradient(135deg,#F472B6,#FB923C)",
  "linear-gradient(135deg,#0EA5E9,#8B5CF6)"
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional override — when omitted, the dialog creates the group itself
   *  via the chat store. Kept for backwards compatibility with callers that
   *  want to intercept the create payload. */
  onCreate?: (group: { name: string; description: string; members: string[] }) => void;
  /** Fires after the group has actually been created in Supabase. Receives
   *  the new chat id so callers can navigate to it. Only invoked when
   *  `onCreate` is NOT provided (the dialog owns the persistence). */
  onCreated?: (chatId: string) => void;
}

export function NewGroupDialog({ open, onOpenChange, onCreate, onCreated }: Props) {
  const t = useT();
  const me = useAuthStore((s) => s.user);
  const addGroup = useChatStore((s) => s.addGroup);
  const uploadAttachment = useChatStore((s) => s.uploadAttachment);
  const [banner, setBanner] = React.useState(GRADIENTS[0]);
  const [avatarSrc, setAvatarSrc] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [picked, setPicked] = React.useState<DirectoryUser[]>([]);
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<DirectoryUser[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Debounced live profile search against Supabase. Empty query lists the
  // most-recently-active profiles so the picker doesn't feel empty on open.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const q = search.trim();
      let query = supabase
        .from("profiles")
        .select("id, name, username, avatar")
        .limit(20);
      if (q) {
        query = query.or(`name.ilike.%${q}%,username.ilike.%${q}%`);
      } else {
        query = query.order("last_seen_at", { ascending: false, nullsFirst: false });
      }
      if (me?.id) query = query.neq("id", me.id);
      const { data } = await query;
      if (cancelled) return;
      setResults((data || []) as DirectoryUser[]);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, open, me?.id]);

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarSrc(URL.createObjectURL(file));
  };

  const togglePick = (u: DirectoryUser) =>
    setPicked((cur) =>
      cur.find((x) => x.id === u.id) ? cur.filter((x) => x.id !== u.id) : [...cur, u]
    );

  const valid = name.trim().length >= 2 && picked.length >= 1;

  const resetForm = () => {
    setName("");
    setDescription("");
    setPicked([]);
    setAvatarSrc(null);
    setAvatarFile(null);
    setBanner(GRADIENTS[0]);
    setSearch("");
  };

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      // If the caller passed onCreate, hand off the payload — keeps any legacy
      // callsite working. Otherwise we own the persistence.
      if (onCreate) {
        onCreate({
          name: name.trim(),
          description: description.trim(),
          members: picked.map((u) => u.id)
        });
      } else {
        let avatarUrl: string | undefined;
        if (avatarFile) {
          const uploaded = await uploadAttachment(avatarFile);
          if (uploaded) avatarUrl = uploaded;
        }
        const created = await addGroup({
          name: name.trim(),
          description: description.trim(),
          memberIds: picked.map((u) => u.id),
          banner,
          avatar: avatarUrl
        });
        onCreated?.(created.id);
      }
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error("[NewGroupDialog] create failed", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-xl !max-h-[92dvh] !p-0 flex flex-col overflow-hidden">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onAvatarFile}
        />

        {/* Banner */}
        <div className="relative h-32" style={{ background: banner }}>
          <motion.div
            className="absolute inset-0"
            animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
            transition={{ duration: 14, repeat: Infinity, repeatType: "reverse" }}
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.25), transparent 50%)",
              backgroundSize: "200% 200%"
            }}
          />

          <DialogTitle className="absolute top-3 left-5 text-white drop-shadow text-lg font-display font-semibold">
            {t("New group")}
          </DialogTitle>

          {/* banner color picker */}
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            {GRADIENTS.map((g) => (
              <button
                key={g}
                onClick={() => setBanner(g)}
                className={cn(
                  "size-5 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition",
                  banner === g ? "ring-white" : "ring-transparent"
                )}
                style={{ background: g }}
              />
            ))}
          </div>

          {/* Group avatar */}
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute -bottom-9 left-5 size-20 rounded-3xl overflow-hidden ring-4 ring-background shadow-floating grid place-items-center bg-card group"
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="size-8 text-muted-foreground group-hover:text-foreground transition" />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition grid place-items-center">
              <Camera className="size-5 text-white" />
            </div>
          </button>
        </div>

        <DialogDescription className="sr-only">
          {t("Create a new group: choose an avatar, banner, name, description, and add people.")}
        </DialogDescription>

        {/* Scroll area */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pt-12 pb-3 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{t("Group name")}</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aurora Design Lab"
              className="!h-11 text-base"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-desc">{t("Description")}</Label>
            <textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t("What's this group about?")}
              className="w-full rounded-xl glass-subtle px-3.5 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t("Add people")}</Label>
              <span className="text-[11px] text-muted-foreground">
                {picked.length} {t("selected")}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("Search people…")}
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {picked.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {picked.map((u) => (
                  <motion.button
                    key={u.id}
                    layout
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    onClick={() => togglePick(u)}
                    className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full glass border border-white/15 text-xs"
                  >
                    <Avatar className="size-5">
                      <AvatarImage src={u.avatar} />
                    </Avatar>
                    {(u.name || u.username || "User").split(" ")[0]}
                    <X className="size-3 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            )}

            <div className="mt-2 grid grid-cols-1 gap-1 max-h-56 overflow-y-auto no-scrollbar">
              {results.map((u) => {
                const sel = !!picked.find((p) => p.id === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => togglePick(u)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-xl transition text-left",
                      sel ? "bg-primary/10" : "hover:bg-foreground/[0.04]"
                    )}
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={u.avatar} />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.name || u.username}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        @{u.username}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "size-5 rounded-full grid place-items-center transition",
                        sel
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/60"
                      )}
                    >
                      {sel && <Check className="size-3" />}
                    </span>
                  </button>
                );
              })}
              {!searching && results.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t("No matches")}
                </p>
              )}
              {searching && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t("Searching…")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/10 bg-background/30 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>{t("End-to-end encrypted")}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button variant="gradient" disabled={!valid || saving} onClick={submit}>
              {saving ? t("Creating…") : t("Save group")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
