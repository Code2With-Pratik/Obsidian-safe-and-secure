"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Camera, Image as ImageIcon, AtSign, Sparkles, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/use-auth-store";
import { cn, initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const BANNER_PRESETS = [
  "linear-gradient(135deg, #8B5CF6, #EC4899, #22D3EE)",
  "linear-gradient(135deg, #22D3EE, #3B82F6, #A78BFA)",
  "linear-gradient(135deg, #FBBF24, #F472B6, #A78BFA)",
  "linear-gradient(135deg, #10B981, #22D3EE, #8B5CF6)",
  "linear-gradient(135deg, #F43F5E, #FB923C, #FBBF24)"
];

const PRONOUN_PRESETS = ["she/her", "he/him", "they/them", "she/they", "he/they"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: Props) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = React.useState(user?.name ?? "");
  const [username, setUsername] = React.useState(user?.username ?? "");
  const [pronouns, setPronouns] = React.useState(user?.pronouns ?? "");
  const [bio, setBio] = React.useState(user?.bio ?? "");
  const [avatar, setAvatar] = React.useState(user?.avatar ?? "");
  const [banner, setBanner] = React.useState(user?.banner ?? BANNER_PRESETS[0]);

  React.useEffect(() => {
    if (open && user) {
      setName(user.name);
      setUsername(user.username);
      setPronouns(user.pronouns ?? "");
      setBio(user.bio ?? "");
      setAvatar(user.avatar);
      setBanner(user.banner ?? BANNER_PRESETS[0]);
    }
  }, [open, user]);

  const handleSave = () => {
    updateUser({
      name: name.trim() || user?.name || "Aria Vance",
      username: username.trim().replace(/^@+/, "") || user?.username || "aria",
      pronouns: pronouns.trim(),
      bio: bio.trim(),
      avatar: avatar.trim() || user?.avatar || "",
      banner
    });
    onOpenChange(false);
  };

  const bannerIsUrl = banner.startsWith("http");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <ScrollArea className="max-h-[85vh]">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="text-xl font-display">{t("Edit profile")}</DialogTitle>
              <DialogDescription>
                {t("Update how the rest of Obsidian sees you.")}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Banner preview + presets */}
          <div className="px-6">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("Banner")}
            </Label>
            <div
              className="relative h-28 mt-2 rounded-2xl overflow-hidden border border-border/60"
              style={
                bannerIsUrl
                  ? { backgroundImage: `url(${banner})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: banner }
              }
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/30" />
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-[10px] text-white">
                <ImageIcon className="size-3" /> {t("preview")}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar pb-1">
              {BANNER_PRESETS.map((g) => (
                <button
                  key={g}
                  onClick={() => setBanner(g)}
                  className={cn(
                    "relative shrink-0 size-10 rounded-xl border border-white/20 transition",
                    banner === g && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  )}
                  style={{ background: g }}
                  aria-label="Banner preset"
                >
                  {banner === g && (
                    <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
            <Input
              value={bannerIsUrl ? banner : ""}
              onChange={(e) => setBanner(e.target.value)}
              placeholder={t("…or paste an image URL")}
              className="mt-2 text-xs"
            />
          </div>

          {/* Avatar */}
          <div className="px-6 mt-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("Avatar")}
            </Label>
            <div className="flex items-center gap-4 mt-2">
              <div className="relative shrink-0">
                <Avatar className="size-16 ring-2 ring-background shadow-floating">
                  <AvatarImage src={avatar} alt={name} />
                  <AvatarFallback>{initials(name || "Aria")}</AvatarFallback>
                </Avatar>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="absolute -bottom-1 -right-1 size-7 rounded-full bg-primary grid place-items-center shadow-glow ring-2 ring-background"
                >
                  <Camera className="size-3.5 text-primary-foreground" />
                </motion.div>
              </div>
              <Input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder={t("Avatar image URL")}
                className="flex-1 text-xs"
              />
            </div>
          </div>

          {/* Name + Username */}
          <div className="px-6 mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ep-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("Name")}
              </Label>
              <Input
                id="ep-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Your display name")}
                className="mt-2"
                maxLength={40}
              />
            </div>
            <div>
              <Label htmlFor="ep-username" className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("Username")}
              </Label>
              <div className="relative mt-2">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="ep-username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())
                  }
                  placeholder={t("handle")}
                  className="pl-8"
                  maxLength={24}
                />
              </div>
            </div>
          </div>

          {/* Pronouns */}
          <div className="px-6 mt-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("Pronouns")}
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRONOUN_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPronouns(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition",
                    pronouns === p
                      ? "bg-foreground text-background"
                      : "glass-subtle text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder={t("Or write your own (e.g. xe/xem)")}
              className="mt-2 text-xs"
              maxLength={20}
            />
          </div>

          {/* Bio */}
          <div className="px-6 mt-5 pb-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="ep-bio" className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("Bio")}
              </Label>
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <Sparkles className="size-3 text-cyan-300" />
                {bio.length}/160
              </span>
            </div>
            <textarea
              id="ep-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder={t("A line about you — what you're building, what you love.")}
              rows={3}
              className="mt-2 w-full rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none transition"
              maxLength={160}
            />
          </div>

          <DialogFooter className="px-6 pb-6 pt-2 gap-2 sm:gap-2">
            <Button variant="glass" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button variant="gradient" onClick={handleSave}>
              <Check />
              {t("Save changes")}
            </Button>
          </DialogFooter>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
