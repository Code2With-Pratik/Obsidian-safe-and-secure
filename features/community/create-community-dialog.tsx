"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Hash, ImagePlus, Image as ImageIcon, Sparkles, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCommunityStore } from "@/store/use-community-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const CATEGORIES = [
  "Design",
  "Music",
  "AI",
  "Startups",
  "Gaming",
  "Space",
  "Photography",
  "Writing",
  "Wellness"
];

/** Built-in cover swatches. The first slot in the picker is a custom upload
 *  tile (see ImageUploadTile) — these are the presets that come after it. */
const COVERS = [
  "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&q=80",
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80"
];

const INTEREST_SUGGESTIONS = [
  "design",
  "ui",
  "ux",
  "music",
  "synthwave",
  "ai",
  "ml",
  "startups",
  "indiehackers",
  "gaming",
  "gamedev",
  "writing",
  "photography",
  "late-night",
  "stargazing"
];

export function CreateCommunityDialog({
  children,
  open: openProp,
  onOpenChange
}: {
  /** Trigger element. Omit when controlling the dialog with `open`. */
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const router = useRouter();
  const createCommunity = useCommunityStore((s) => s.createCommunity);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("Design");
  const [cover, setCover] = React.useState(COVERS[0]);
  const [interestInput, setInterestInput] = React.useState("");
  const [interests, setInterests] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  /** Custom cover the user uploaded from their device (data URL). */
  const [customCover, setCustomCover] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setCategory("Design");
      setCover(COVERS[0]);
      setCustomCover(null);
      setInterests([]);
      setInterestInput("");
    }
  }, [open]);

  const addInterest = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/^#/, "");
    if (!clean) return;
    if (interests.includes(clean)) return;
    if (interests.length >= 8) return;
    setInterests((t) => [...t, clean]);
    setInterestInput("");
  };
  const removeInterest = (tag: string) =>
    setInterests((t) => t.filter((x) => x !== tag));

  const handleSubmit = () => {
    const community = createCommunity({
      name,
      description,
      category,
      cover,
      interests
    });
    setOpen(false);
    router.push(`/discover/community/${community.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="!max-w-xl !max-h-[90dvh] !p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow mb-2">
            <Users className="text-white" />
          </div>
          <DialogTitle className="text-xl">{t("Start a community")}</DialogTitle>
          <DialogDescription>
            {t("You're the host. Only you can post — everyone else reacts and joins the vibe.")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2 space-y-4">
          <div className="space-y-1.5">
            <Label>{t("Name")}</Label>
            <Input
              placeholder="e.g. Glass UI Lab"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("Description")}</Label>
            <Input
              placeholder={t("What is this community about?")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={160}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("Category")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "px-3 h-8 rounded-full text-xs font-medium transition",
                      active
                        ? "bg-foreground text-background"
                        : "bg-foreground/10 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("Interest tags")}</Label>
            <p className="text-[11px] text-muted-foreground -mt-1">
              {t("Members with these in their profile will see \"X people match your interest\" when they join.")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {interests.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-violet-500/15 border border-violet-400/40 text-xs text-violet-200"
                >
                  <Hash className="size-3" />
                  {t}
                  <button
                    type="button"
                    onClick={() => removeInterest(t)}
                    className="ml-0.5 size-4 grid place-items-center rounded-full hover:bg-foreground/10"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {interests.length < 8 && (
                <input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addInterest(interestInput);
                    }
                    if (e.key === "Backspace" && !interestInput && interests.length) {
                      removeInterest(interests[interests.length - 1]);
                    }
                  }}
                  placeholder={interests.length === 0 ? "design, music, ai…" : t("+ add")}
                  className="h-7 min-w-24 px-2 rounded-full bg-foreground/5 text-xs outline-none border border-transparent focus:border-foreground/20"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {INTEREST_SUGGESTIONS.filter((s) => !interests.includes(s))
                .slice(0, 8)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addInterest(s)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition"
                  >
                    #{s}
                  </button>
                ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="size-3" /> {t("Cover")}
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const url = reader.result as string;
                  setCustomCover(url);
                  setCover(url);
                };
                reader.readAsDataURL(file);
                // Reset so re-selecting the same file still fires onChange.
                e.target.value = "";
              }}
            />
            <div className="grid grid-cols-3 gap-2">
              {/* Upload-from-device tile — always first in the grid. */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative aspect-[3/2] md:aspect-video rounded-xl overflow-hidden ring-2 transition grid place-items-center",
                  customCover && cover === customCover
                    ? "ring-cyan-400 shadow-glow-cyan"
                    : "ring-white/10 hover:ring-white/30",
                  !customCover && "bg-gradient-to-br from-white/10 to-white/[0.02]"
                )}
                aria-label={t("Upload cover from device")}
              >
                {customCover ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={customCover}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
                    <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur text-[9px] text-white">
                      <Check className="size-2.5" /> {t("custom")}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="size-9 rounded-full bg-white/10 grid place-items-center ring-1 ring-white/20">
                      <ImagePlus className="size-4 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-white/80">
                      {t("Upload")}
                    </span>
                  </div>
                )}
              </button>

              {COVERS.map((c) => {
                const active = c === cover && c !== customCover;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCover(c)}
                    className={cn(
                      "relative aspect-[3/2] md:aspect-video rounded-xl overflow-hidden ring-2 transition",
                      active
                        ? "ring-cyan-400 shadow-glow-cyan"
                        : "ring-white/10 hover:ring-white/30"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="!justify-between px-6 py-4 border-t border-border/40 bg-background/30 backdrop-blur-md">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="gradient" onClick={handleSubmit} disabled={!name.trim()}>
            <Sparkles /> {t("Launch community")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
