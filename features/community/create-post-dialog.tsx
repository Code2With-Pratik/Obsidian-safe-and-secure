"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  AtSign,
  BarChart3,
  Check,
  Image as ImageIcon,
  Music,
  Plus,
  Sparkles,
  Type,
  Video,
  X
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCommunityStore } from "@/store/use-community-store";
import { useT } from "@/lib/i18n";
import { users } from "@/lib/mock-data";
import type { CommunityPostKind, CommunitySong } from "@/types";

type Tab = "text" | "image" | "video" | "song" | "poll";

const SONG_LIBRARY: CommunitySong[] = [
  {
    title: "Ylang Ylang",
    artist: "FKJ",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
    durationSec: 264
  },
  {
    title: "Midnight City",
    artist: "M83",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80",
    durationSec: 244
  },
  {
    title: "Open",
    artist: "Rhye",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
    durationSec: 218
  },
  {
    title: "Synth Drift",
    artist: "Helios",
    cover: "https://images.unsplash.com/photo-1482424917728-d82d29662023?w=400&q=80",
    durationSec: 196
  }
];

const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=900&q=80",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=900&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80",
  "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=900&q=80",
  "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=900&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&q=80"
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
}

export function CreatePostDialog({ open, onOpenChange, communityId }: Props) {
  const t = useT();
  const createPost = useCommunityStore((s) => s.createPost);
  const [tab, setTab] = React.useState<Tab>("text");
  const [content, setContent] = React.useState("");
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
  const [songIdx, setSongIdx] = React.useState<number | null>(null);
  const [pollQuestion, setPollQuestion] = React.useState("");
  const [pollOptions, setPollOptions] = React.useState<string[]>(["", ""]);
  const [mentions, setMentions] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setTab("text");
      setContent("");
      setSelectedImages([]);
      setSongIdx(null);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setMentions([]);
    }
  }, [open]);

  const handleSubmit = () => {
    const kind: CommunityPostKind = tab;
    let payload: Parameters<typeof createPost>[1];
    switch (tab) {
      case "image":
        if (selectedImages.length === 0) return;
        payload = {
          kind,
          content: content || undefined,
          media: selectedImages.map((url) => ({ url, kind: "image" as const })),
          mentions
        };
        break;
      case "video":
        // For demo: treat the first selected image as a "video thumbnail" entry.
        if (selectedImages.length === 0) return;
        payload = {
          kind,
          content: content || undefined,
          media: [{ url: selectedImages[0], kind: "video" as const }],
          mentions
        };
        break;
      case "song":
        if (songIdx === null) return;
        payload = { kind, content: content || undefined, song: SONG_LIBRARY[songIdx], mentions };
        break;
      case "poll":
        if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) return;
        payload = {
          kind,
          content: content || undefined,
          poll: {
            question: pollQuestion,
            options: pollOptions
              .filter((o) => o.trim())
              .map((label, i) => ({ id: `o${i + 1}`, label, votes: 0 }))
          },
          mentions
        };
        break;
      default:
        if (!content.trim()) return;
        payload = { kind: "text", content, mentions };
    }
    createPost(communityId, payload);
    onOpenChange(false);
  };

  const canSubmit =
    tab === "text"
      ? !!content.trim()
      : tab === "image"
        ? selectedImages.length > 0
        : tab === "video"
          ? selectedImages.length > 0
          : tab === "song"
            ? songIdx !== null
            : pollQuestion.trim() &&
              pollOptions.filter((o) => o.trim()).length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-xl !max-h-[90dvh] !p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow mb-2">
            <Sparkles className="text-white" />
          </div>
          <DialogTitle className="text-xl">{t("Post to your community")}</DialogTitle>
          <DialogDescription>
            {t("Only the host (you) can post. Members react and share the vibe.")}
          </DialogDescription>
        </DialogHeader>

        {/* Type tabs */}
        <div className="px-6 mt-2">
          <div className="flex items-center gap-1 p-1 rounded-2xl glass-subtle">
            <TypeTab tab="text" active={tab === "text"} onClick={() => setTab("text")} icon={<Type className="size-3.5" />}>
              {t("Text")}
            </TypeTab>
            <TypeTab tab="image" active={tab === "image"} onClick={() => setTab("image")} icon={<ImageIcon className="size-3.5" />}>
              {t("Image")}
            </TypeTab>
            <TypeTab tab="video" active={tab === "video"} onClick={() => setTab("video")} icon={<Video className="size-3.5" />}>
              {t("Video")}
            </TypeTab>
            <TypeTab tab="song" active={tab === "song"} onClick={() => setTab("song")} icon={<Music className="size-3.5" />}>
              {t("Song")}
            </TypeTab>
            <TypeTab tab="poll" active={tab === "poll"} onClick={() => setTab("poll")} icon={<BarChart3 className="size-3.5" />}>
              {t("Poll")}
            </TypeTab>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2 pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="!text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("What's on your mind?")}
            </Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                tab === "poll"
                  ? t("Add a short intro (optional)")
                  : t("Write something to share with your community…")
              }
              rows={3}
              className="w-full rounded-xl bg-background/40 border border-border/60 p-3 text-sm outline-none resize-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            />
          </div>

          {tab === "image" && (
            <div className="space-y-1.5">
              <Label className="!text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("Pick image(s) — up to 4")}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {STOCK_IMAGES.map((url) => {
                  const picked = selectedImages.includes(url);
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() =>
                        setSelectedImages((cur) =>
                          picked
                            ? cur.filter((x) => x !== url)
                            : cur.length < 4
                              ? [...cur, url]
                              : cur
                        )
                      }
                      className={cn(
                        "relative aspect-square rounded-xl overflow-hidden ring-2 transition",
                        picked ? "ring-cyan-400 shadow-glow-cyan" : "ring-white/10 hover:ring-white/30"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      {picked && (
                        <span className="absolute top-1.5 right-1.5 size-5 rounded-full bg-cyan-400 text-black grid place-items-center">
                          <Check className="size-3" strokeWidth={4} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "video" && (
            <div className="space-y-1.5">
              <Label className="!text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("Pick a video thumbnail")}
              </Label>
              <p className="text-[11px] text-muted-foreground -mt-1">
                {t("Demo only — the first thumbnail you select will play as the post's video.")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {STOCK_IMAGES.map((url) => {
                  const picked = selectedImages[0] === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedImages([url])}
                      className={cn(
                        "relative aspect-video rounded-xl overflow-hidden ring-2 transition",
                        picked ? "ring-cyan-400 shadow-glow-cyan" : "ring-white/10 hover:ring-white/30"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <span className="absolute inset-0 grid place-items-center bg-black/30">
                        <Video className="size-5 text-white" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "song" && (
            <div className="space-y-1.5">
              <Label className="!text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("Pick a track")}
              </Label>
              <div className="space-y-1.5">
                {SONG_LIBRARY.map((s, i) => {
                  const picked = songIdx === i;
                  return (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => setSongIdx(i)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-xl border transition text-left",
                        picked
                          ? "border-cyan-400/60 bg-cyan-400/10 ring-1 ring-cyan-400/30"
                          : "border-border/60 hover:border-border bg-foreground/[0.02]"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.cover} alt="" className="size-10 rounded-md object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.artist}</p>
                      </div>
                      {picked && <Check className="size-4 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "poll" && (
            <div className="space-y-2">
              <div>
                <Label className="!text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("Question")}
                </Label>
                <Input
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder={t("What do you want to ask?")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="!text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("Options (2–4)")}
                </Label>
                {pollOptions.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={o}
                      onChange={(e) =>
                        setPollOptions((cur) =>
                          cur.map((v, idx) => (idx === i ? e.target.value : v))
                        )
                      }
                      placeholder={`${t("Option")} ${i + 1}`}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPollOptions((cur) => cur.filter((_, idx) => idx !== i))
                        }
                        className="size-8 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions((cur) => [...cur, ""])}
                    className="text-xs text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1"
                  >
                    <Plus className="size-3" /> {t("Add option")}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="!text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("Tag people")}
            </Label>
            <MentionPicker mentions={mentions} setMentions={setMentions} />
          </div>
        </div>

        <DialogFooter className="!justify-between px-6 py-4 border-t border-border/40 bg-background/30 backdrop-blur-md">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="gradient" onClick={handleSubmit} disabled={!canSubmit}>
            <Sparkles /> {t("Publish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypeTab({
  active,
  onClick,
  icon,
  children
}: {
  tab: Tab;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium transition",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function MentionPicker({
  mentions,
  setMentions
}: {
  mentions: string[];
  setMentions: (next: string[]) => void;
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const choices = users
    .filter((u) => u.id !== "me")
    .filter(
      (u) =>
        u.name.toLowerCase().includes(q.toLowerCase()) ||
        u.username.toLowerCase().includes(q.toLowerCase())
    );
  return (
    <div className="flex flex-wrap gap-1.5">
      {mentions
        .map((id) => users.find((u) => u.id === id))
        .filter(Boolean)
        .map((u) => (
          <span
            key={u!.id}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-full bg-violet-500/15 border border-violet-400/40 text-xs text-violet-200"
          >
            @{u!.username}
            <button
              type="button"
              onClick={() => setMentions(mentions.filter((id) => id !== u!.id))}
              className="ml-0.5 size-4 grid place-items-center rounded-full hover:bg-foreground/10"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-7 px-2 rounded-full bg-foreground/10 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/15 transition"
          >
            <AtSign className="size-3" /> {t("Mention")}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="!w-72 !p-0">
          <div className="p-2 border-b border-border/40">
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search by name or @username")}
              className="h-9"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {choices.slice(0, 12).map((u) => {
              const picked = mentions.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    if (picked) setMentions(mentions.filter((id) => id !== u.id));
                    else setMentions([...mentions, u.id]);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-foreground/5 text-left"
                >
                  <Avatar className="size-7">
                    <AvatarImage src={u.avatar} />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      @{u.username}
                    </p>
                  </div>
                  {picked && <Check className="size-4 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
