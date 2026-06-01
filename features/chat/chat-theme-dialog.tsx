"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, ImagePlus, Palette, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CHAT_THEMES,
  CUSTOM_THEME_ID,
  useChatThemeStore,
  type ChatTheme
} from "@/store/use-chat-theme-store";
import { cn } from "@/lib/utils";

type Props =
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      chatId: string;
      global?: false;
    }
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      global: true;
      chatId?: undefined;
    };

export function ChatThemeDialog(props: Props) {
  const { open, onOpenChange } = props;
  const isGlobal = props.global === true;

  const perChatTheme = useChatThemeStore((s) =>
    !isGlobal ? s.byChat[props.chatId] ?? "default" : "default"
  );
  const perChatCustomBg = useChatThemeStore((s) =>
    !isGlobal ? s.customBgByChat[props.chatId!] : undefined
  );
  const globalTheme = useChatThemeStore((s) => s.globalTheme);
  const globalCustomBg = useChatThemeStore((s) => s.globalCustomBg);

  const setTheme = useChatThemeStore((s) => s.setTheme);
  const setCustomBg = useChatThemeStore((s) => s.setCustomBg);
  const setGlobalTheme = useChatThemeStore((s) => s.setGlobalTheme);
  const setGlobalCustomBg = useChatThemeStore((s) => s.setGlobalCustomBg);
  const resetAllChatThemes = useChatThemeStore((s) => s.resetAllChatThemes);

  const initialTheme = isGlobal ? globalTheme : perChatTheme;
  const initialCustomBg = isGlobal ? globalCustomBg : perChatCustomBg;

  const [picked, setPicked] = React.useState(initialTheme);
  const [customImg, setCustomImg] = React.useState<string | undefined>(initialCustomBg);
  const [overrideAll, setOverrideAll] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setPicked(initialTheme);
      setCustomImg(initialCustomBg);
      setOverrideAll(false);
    }
  }, [open, initialTheme, initialCustomBg]);

  const apply = () => {
    if (isGlobal) {
      if (picked === CUSTOM_THEME_ID && customImg) {
        setGlobalCustomBg(customImg);
      } else {
        setGlobalTheme(picked);
      }
      if (overrideAll) resetAllChatThemes();
    } else {
      if (picked === CUSTOM_THEME_ID && customImg) {
        setCustomBg(props.chatId!, customImg);
      } else {
        setTheme(props.chatId!, picked);
      }
    }
    onOpenChange(false);
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCustomImg(result);
      setPicked(CUSTOM_THEME_ID);
    };
    reader.readAsDataURL(file);
  };

  const previewTheme: ChatTheme =
    picked === CUSTOM_THEME_ID
      ? {
          id: CUSTOM_THEME_ID,
          name: "Custom",
          bubbleMe: "linear-gradient(135deg,#8B5CF6,#EC4899)",
          bubbleThem: "rgba(0,0,0,0.32)",
          accent: "#8B5CF6",
          bg: customImg
            ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url("${customImg}") center/cover no-repeat`
            : "",
          category: "gradient"
        }
      : CHAT_THEMES.find((t) => t.id === picked) ?? CHAT_THEMES[0];

  const title = isGlobal ? "Default chat theme" : "Chat theme";
  const description = isGlobal
    ? "Set the default vibe for every conversation. Individual chats can still override it."
    : "Pick a vibe just for this conversation. Only you and the people in this chat will see it.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-2xl !max-h-[90dvh] !p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center shadow-glow mb-2">
            <Palette className="text-white" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pb-2 space-y-4">
          <PreviewBubbles theme={previewTheme} />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <ThemeSection title="Photos">
            <CustomTile
              active={picked === CUSTOM_THEME_ID}
              image={customImg}
              onPick={handlePickFile}
              onClear={(e) => {
                e.stopPropagation();
                setCustomImg(undefined);
                if (picked === CUSTOM_THEME_ID) setPicked("default");
              }}
            />
            {CHAT_THEMES.filter((t) => t.category === "photo").map((t) => (
              <ThemeTile
                key={t.id}
                theme={t}
                active={picked === t.id}
                onClick={() => setPicked(t.id)}
                showTexture
              />
            ))}
          </ThemeSection>

          <ThemeSection title="Gradients">
            {CHAT_THEMES.filter((t) => t.category === "gradient").map((t) => (
              <ThemeTile
                key={t.id}
                theme={t}
                active={picked === t.id}
                onClick={() => setPicked(t.id)}
              />
            ))}
          </ThemeSection>

          <ThemeSection title="Patterns">
            {CHAT_THEMES.filter((t) => t.category === "pattern").map((t) => (
              <ThemeTile
                key={t.id}
                theme={t}
                active={picked === t.id}
                onClick={() => setPicked(t.id)}
                showTexture
              />
            ))}
          </ThemeSection>

          {isGlobal && (
            <label className="flex items-center gap-3 p-3 rounded-xl glass-subtle cursor-pointer">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Override per-chat themes</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Replace any custom themes you've picked on individual chats.
                </p>
              </div>
              <Switch checked={overrideAll} onCheckedChange={setOverrideAll} />
            </label>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-white/10 bg-background/30 backdrop-blur-md">
          <button
            onClick={() => {
              setPicked("default");
              setCustomImg(undefined);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={apply}
              disabled={picked === CUSTOM_THEME_ID && !customImg}
            >
              {isGlobal ? "Save default" : "Apply theme"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomTile({
  active,
  image,
  onPick,
  onClear
}: {
  active: boolean;
  image?: string;
  onPick: () => void;
  onClear: (e: React.MouseEvent) => void;
}) {
  return (
    // Outer wrapper is a div with role=button so the inner "remove" <button>
    // isn't nested inside another <button> (invalid HTML → hydration error).
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "relative aspect-square rounded-2xl overflow-hidden ring-2 transition cursor-pointer focus-visible:outline-none focus-visible:ring-cyan-400",
        active ? "ring-cyan-400 shadow-glow-cyan" : "ring-white/10 hover:ring-white/30",
        !image && "bg-gradient-to-br from-white/10 to-white/[0.02]"
      )}
    >
      {image ? (
        <>
          <img src={image} alt="Custom background" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear(e);
            }}
            className="absolute top-2 left-2 size-5 rounded-full bg-black/60 hover:bg-black/80 grid place-items-center transition"
            aria-label="Remove custom background"
          >
            <X className="size-3 text-white" />
          </button>
          <div className="absolute bottom-2 left-2.5 right-2.5 text-xs font-semibold text-white drop-shadow text-left">
            Custom
          </div>
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="size-9 rounded-full bg-white/10 grid place-items-center ring-1 ring-white/20">
              <ImagePlus className="size-4 text-white" />
            </div>
            <div className="text-[10px] font-semibold text-white/80">Add photo</div>
          </div>
        </div>
      )}
      {active && (
        <motion.div
          layoutId="theme-check"
          className="absolute top-2 right-2 size-5 rounded-full bg-white grid place-items-center shadow-glow"
        >
          <Check className="size-3 text-violet-500" />
        </motion.div>
      )}
    </motion.div>
  );
}

function ThemeSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          {title}
        </h4>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      <div className="grid grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function ThemeTile({
  theme,
  active,
  onClick,
  showTexture
}: {
  theme: ChatTheme;
  active: boolean;
  onClick: () => void;
  showTexture?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "relative aspect-square rounded-2xl overflow-hidden ring-2 transition",
        active ? "ring-cyan-400 shadow-glow-cyan" : "ring-white/10 hover:ring-white/30"
      )}
    >
      <div
        className="absolute inset-0"
        style={{ background: showTexture && theme.bg ? theme.bg : theme.bubbleMe }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
      <div className="absolute bottom-2 left-2.5 right-2.5 text-xs font-semibold text-white drop-shadow text-left">
        {theme.name}
      </div>
      {active && (
        <motion.div
          layoutId="theme-check"
          className="absolute top-2 right-2 size-5 rounded-full bg-white grid place-items-center shadow-glow"
        >
          <Check className="size-3 text-violet-500" />
        </motion.div>
      )}
    </motion.button>
  );
}

function PreviewBubbles({ theme }: { theme: ChatTheme }) {
  const themStyle: React.CSSProperties = { background: theme.bubbleThem };
  if (theme.textOnThem) themStyle.color = theme.textOnThem;
  const meStyle: React.CSSProperties = {
    background: theme.bubbleMe,
    color: theme.textOnMe ?? "#ffffff"
  };
  return (
    <div
      className="relative rounded-2xl p-4 md:p-5 overflow-hidden bg-card/40 border border-white/10"
      style={{ background: theme.bg || undefined }}
    >
      <div className="absolute inset-0 grid-fade opacity-30" />
      <div className="relative space-y-2">
        <div className="flex justify-start">
          <div
            className="max-w-[70%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm glass border border-white/10"
            style={themStyle}
          >
            What about this look? ✨
          </div>
        </div>
        <div className="flex justify-end">
          <div
            className="max-w-[70%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)]"
            style={meStyle}
          >
            Honestly I'm in love. Apply it.
          </div>
        </div>
        <div className="flex justify-end">
          <div
            className="max-w-[40%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm"
            style={meStyle}
          >
            🔥🔥
          </div>
        </div>
      </div>
    </div>
  );
}
