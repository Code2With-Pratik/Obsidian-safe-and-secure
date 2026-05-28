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
import { users } from "@/lib/mock-data";
import { cn, initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";

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
  onCreate?: (group: { name: string; description: string; members: string[] }) => void;
}

export function NewGroupDialog({ open, onOpenChange, onCreate }: Props) {
  const t = useT();
  const [banner, setBanner] = React.useState(GRADIENTS[0]);
  const [avatarSrc, setAvatarSrc] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const directory = users.filter(
    (u) =>
      u.id !== "me" &&
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarSrc(URL.createObjectURL(file));
  };

  const togglePick = (id: string) =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );

  const valid = name.trim().length >= 2 && picked.length >= 1;

  const submit = () => {
    if (!valid) return;
    onCreate?.({ name: name.trim(), description: description.trim(), members: picked });
    onOpenChange(false);
    // reset
    setName("");
    setDescription("");
    setPicked([]);
    setAvatarSrc(null);
    setBanner(GRADIENTS[0]);
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
                {picked.map((id) => {
                  const u = users.find((x) => x.id === id);
                  if (!u) return null;
                  return (
                    <motion.button
                      key={id}
                      layout
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      onClick={() => togglePick(id)}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full glass border border-white/15 text-xs"
                    >
                      <Avatar className="size-5">
                        <AvatarImage src={u.avatar} />
                      </Avatar>
                      {u.name.split(" ")[0]}
                      <X className="size-3 text-muted-foreground" />
                    </motion.button>
                  );
                })}
              </div>
            )}

            <div className="mt-2 grid grid-cols-1 gap-1 max-h-56 overflow-y-auto no-scrollbar">
              {directory.map((u) => {
                const sel = picked.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => togglePick(u.id)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-xl transition text-left",
                      sel ? "bg-primary/10" : "hover:bg-foreground/[0.04]"
                    )}
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={u.avatar} />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
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
              {directory.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t("No matches")}
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
            <Button variant="gradient" disabled={!valid} onClick={submit}>
              {t("Save group")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
