"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Camera, Sparkles, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useChatStore } from "@/store/use-chat-store";
import type { Chat } from "@/types";

/**
 *  Mirror of the gradient presets in `new-group-dialog.tsx`. Kept inline
 *  rather than imported so both dialogs can evolve independently — and so
 *  this file has zero coupling to the create flow.
 */
const GRADIENTS = [
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#22D3EE,#3B82F6)",
  "linear-gradient(135deg,#A3E635,#22D3EE)",
  "linear-gradient(135deg,#FBBF24,#EC4899)",
  "linear-gradient(135deg,#F472B6,#FB923C)",
  "linear-gradient(135deg,#0EA5E9,#8B5CF6)"
];

interface Props {
  chat: Chat;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 *  Edit-group dialog — rename, change description, swap avatar, change
 *  banner (gradient OR uploaded image / GIF / video). Mirrors
 *  `NewGroupDialog` but only writes back the editable fields the user
 *  changed via `useChatStore.updateGroup`.
 *
 *  Group-membership edits stay in the existing `ChatMembersCard` panel
 *  list — keeping member CRUD there keeps THIS dialog focused on the
 *  group's "identity" (name + branding) which is what the pencil icon
 *  on the group avatar invites editing.
 */
export function EditGroupDialog({ chat, open, onOpenChange }: Props) {
  const t = useT();
  const updateGroup = useChatStore((s) => s.updateGroup);
  const uploadAttachment = useChatStore((s) => s.uploadAttachment);

  const [name, setName] = React.useState(chat.name);
  const [description, setDescription] = React.useState(chat.description ?? "");
  const [banner, setBanner] = React.useState(chat.banner ?? GRADIENTS[0]);
  // Avatar lives in state separately because the picker swaps between a
  // local blob URL (instant preview) and a Supabase public URL (on save).
  const [avatar, setAvatar] = React.useState<string | undefined>(chat.avatar);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [bannerFile, setBannerFile] = React.useState<File | null>(null);
  const [bannerIsVideo, setBannerIsVideo] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);

  // Re-sync inputs whenever the dialog opens — important because the chat
  // row can change between opens (e.g. another member renamed the group)
  // and we don't want stale form state to clobber that with an old name.
  React.useEffect(() => {
    if (!open) return;
    setName(chat.name);
    setDescription(chat.description ?? "");
    setBanner(chat.banner ?? GRADIENTS[0]);
    setAvatar(chat.avatar);
    setAvatarFile(null);
    setBannerFile(null);
    setBannerIsVideo(false);
  }, [open, chat.name, chat.description, chat.banner, chat.avatar]);

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatar(URL.createObjectURL(file));
    e.target.value = "";
  };

  const onBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerIsVideo(file.type.startsWith("video/"));
    setBanner(URL.createObjectURL(file));
    e.target.value = "";
  };

  // Compute the patch of fields that ACTUALLY changed. Submitting nothing
  // is allowed (we just close), but we don't send a no-op UPDATE.
  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const patch: {
        name?: string;
        description?: string;
        banner?: string;
        avatar?: string;
      } = {};

      const trimmedName = name.trim();
      if (trimmedName && trimmedName !== chat.name) patch.name = trimmedName;
      const trimmedDesc = description.trim();
      if (trimmedDesc !== (chat.description ?? "")) patch.description = trimmedDesc;

      // Banner — if the user picked a file we upload it now and replace
      // the transient blob URL with the public URL before writing the DB.
      if (bannerFile) {
        const uploaded = await uploadAttachment(bannerFile);
        if (uploaded) {
          patch.banner = uploaded;
          try {
            URL.revokeObjectURL(banner);
          } catch {
            /* not a blob URL — harmless */
          }
        }
      } else if (banner !== (chat.banner ?? GRADIENTS[0])) {
        // Gradient picked from presets — store directly.
        patch.banner = banner;
      }

      // Avatar — same treatment as banner.
      if (avatarFile) {
        const uploaded = await uploadAttachment(avatarFile);
        if (uploaded) {
          patch.avatar = uploaded;
          if (avatar) {
            try {
              URL.revokeObjectURL(avatar);
            } catch {
              /* harmless */
            }
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await updateGroup(chat.id, patch);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[EditGroupDialog] save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    name.trim() !== chat.name ||
    description.trim() !== (chat.description ?? "") ||
    !!avatarFile ||
    !!bannerFile ||
    banner !== (chat.banner ?? GRADIENTS[0]);

  const isGradient = /^(linear|radial|conic)-gradient/.test(banner);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-xl !p-0 flex flex-col overflow-hidden">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onAvatarFile}
        />
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={onBannerFile}
        />

        {/* Banner — same three-branch render as NewGroupDialog. */}
        <div className="relative h-32">
          {bannerIsVideo ? (
            <video
              src={banner}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 size-full object-cover bg-black"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={
                isGradient
                  ? { background: banner }
                  : {
                      backgroundImage: `url("${banner}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }
              }
            >
              {isGradient && (
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
              )}
            </div>
          )}

          <DialogTitle className="absolute top-3 left-5 text-white drop-shadow text-lg font-display font-semibold">
            {t("Edit group")}
          </DialogTitle>

          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              aria-label={t("Upload banner image or video")}
              title={t("Upload banner image or video")}
              className="size-6 rounded-full bg-black/40 backdrop-blur grid place-items-center text-white hover:bg-black/60 ring-2 ring-white/40 hover:ring-white transition"
            >
              <Camera className="size-3.5" />
            </button>
            <div className="flex gap-1.5">
              {GRADIENTS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setBanner(g);
                    setBannerFile(null);
                    setBannerIsVideo(false);
                  }}
                  aria-label="Banner gradient"
                  className={cn(
                    "size-5 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition",
                    banner === g ? "ring-white" : "ring-transparent"
                  )}
                  style={{ background: g }}
                />
              ))}
            </div>
          </div>

          {/* Group avatar — floats half outside the banner. */}
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute -bottom-9 left-5 size-20 rounded-3xl overflow-hidden ring-4 ring-background shadow-floating grid place-items-center bg-card group"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="size-8 text-muted-foreground group-hover:text-foreground transition" />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition grid place-items-center">
              <Camera className="size-5 text-white" />
            </div>
          </button>
        </div>

        <DialogDescription className="sr-only">
          {t("Edit the group's name, description, banner, and avatar.")}
        </DialogDescription>

        {/* Scroll area */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pt-12 pb-3 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="edit-group-name">{t("Group name")}</Label>
            <Input
              id="edit-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Group name")}
              className="!h-11 text-base"
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-group-desc">{t("Description")}</Label>
            <textarea
              id="edit-group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={t("What's this group about?")}
              className="w-full rounded-xl glass-subtle px-3.5 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-ring"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/10 bg-background/30 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>{t("Changes sync to everyone")}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("Cancel")}
            </Button>
            <Button variant="gradient" disabled={!dirty || saving || !name.trim()} onClick={submit}>
              {saving ? t("Saving…") : t("Save changes")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
