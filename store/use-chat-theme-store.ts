"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export type ChatThemeCategory = "photo" | "gradient" | "pattern";

export interface ChatTheme {
  id: string;
  name: string;
  bubbleMe: string; // me bubble bg
  bubbleThem: string; // them bubble bg
  accent: string;
  bg: string; // chat canvas background
  category: ChatThemeCategory;
  /** Text color for me-bubble. Defaults to white. */
  textOnMe?: string;
  /** Text color for them-bubble. Defaults to inherited foreground. */
  textOnThem?: string;
}

const svg = (markup: string) =>
  `url("data:image/svg+xml;utf8,${markup.replace(/#/g, "%23")}")`;

const HEARTS = svg(
  "<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><path d='M30 46 C10 30 8 18 18 14 C24 12 30 21 30 21 C30 21 36 12 42 14 C52 18 50 30 30 46 Z' fill='#ffffff' opacity='0.18'/></svg>"
);
const STARS = svg(
  "<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70' viewBox='0 0 70 70'><path d='M35 10 L40 25 L55 25 L43 34 L48 49 L35 40 L22 49 L27 34 L15 25 L30 25 Z' fill='#ffffff' opacity='0.2'/><circle cx='12' cy='58' r='1.5' fill='#ffffff' opacity='0.5'/><circle cx='58' cy='14' r='1.2' fill='#ffffff' opacity='0.45'/></svg>"
);
const WAVES = svg(
  "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='30' viewBox='0 0 100 30'><path d='M0 15 Q 12.5 0 25 15 T 50 15 T 75 15 T 100 15' stroke='#ffffff' stroke-opacity='0.28' stroke-width='2' fill='none'/></svg>"
);
const CONFETTI = svg(
  "<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'><circle cx='10' cy='12' r='2.5' fill='#ffffff' opacity='0.28'/><circle cx='35' cy='22' r='1.8' fill='#ffffff' opacity='0.24'/><circle cx='20' cy='38' r='3' fill='#ffffff' opacity='0.22'/><rect x='40' y='6' width='4' height='4' rx='1' fill='#ffffff' opacity='0.22' transform='rotate(20 42 8)'/></svg>"
);
const TRIANGLES = svg(
  "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='70' viewBox='0 0 80 70'><polygon points='20,12 35,42 5,42' fill='#ffffff' opacity='0.18'/><polygon points='60,28 75,58 45,58' fill='#ffffff' opacity='0.14'/></svg>"
);
const BUBBLES = svg(
  "<svg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 110 110'><circle cx='25' cy='25' r='12' fill='none' stroke='#ffffff' stroke-opacity='0.3' stroke-width='1.5'/><circle cx='80' cy='50' r='18' fill='none' stroke='#ffffff' stroke-opacity='0.22' stroke-width='1.5'/><circle cx='45' cy='90' r='10' fill='none' stroke='#ffffff' stroke-opacity='0.28' stroke-width='1.5'/></svg>"
);

const gradient = (id: string, name: string, accent: string, bubbleMe: string, bg: string): ChatTheme => ({
  id,
  name,
  bubbleMe,
  bubbleThem: "rgba(0,0,0,0.32)",
  accent,
  bg,
  category: "gradient"
});

const pattern = (
  id: string,
  name: string,
  accent: string,
  bubbleMe: string,
  gradientBg: string,
  texture: string
): ChatTheme => ({
  id,
  name,
  bubbleMe,
  bubbleThem: "rgba(0,0,0,0.32)",
  accent,
  bg: `${texture} repeat, ${gradientBg}`,
  category: "pattern"
});

const photo = (opts: {
  id: string;
  name: string;
  accent: string;
  bubbleMe: string;
  bubbleThem: string;
  textOnMe: string;
  textOnThem: string;
  url: string;
  overlay?: string;
}): ChatTheme => ({
  id: opts.id,
  name: opts.name,
  bubbleMe: opts.bubbleMe,
  bubbleThem: opts.bubbleThem,
  accent: opts.accent,
  textOnMe: opts.textOnMe,
  textOnThem: opts.textOnThem,
  bg: `linear-gradient(${opts.overlay ?? "rgba(0,0,0,0.15)"}, ${opts.overlay ?? "rgba(0,0,0,0.15)"}), url("${opts.url}") center/cover no-repeat`,
  category: "photo"
});

export const CHAT_THEMES: ChatTheme[] = [
  // Photos — image wallpapers bundled in /public. Light pastel bubbles with dark text,
  // per the "5 perfect chat themes" reference palette.
  photo({
    id: "wp-autumn",
    name: "Sunny Day",
    accent: "#10B981",
    bubbleMe: "linear-gradient(135deg,#BBF7D0,#86EFAC)",
    bubbleThem: "rgba(255,253,245,0.94)",
    textOnMe: "#064E3B",
    textOnThem: "#1F2937",
    url: "/Background.jpg",
    overlay: "rgba(0,0,0,0.08)"
  }),
  photo({
    id: "wp-pop",
    name: "Colorful Art",
    accent: "#F87171",
    bubbleMe: "linear-gradient(135deg,#FCA5A5,#F87171)",
    bubbleThem: "rgba(255,245,245,0.94)",
    textOnMe: "#7F1D1D",
    textOnThem: "#7F1D1D",
    url: "/Background2.jpg",
    overlay: "rgba(0,0,0,0.12)"
  }),
  photo({
    id: "wp-beach",
    name: "Tropical Beach",
    accent: "#0EA5E9",
    bubbleMe: "linear-gradient(135deg,#FDE68A,#FCD34D)",
    bubbleThem: "rgba(241,245,249,0.94)",
    textOnMe: "#78350F",
    textOnThem: "#1E3A8A",
    url: "/Background3.jpg",
    overlay: "rgba(0,0,0,0.1)"
  }),
  photo({
    id: "wp-blossom",
    name: "Cherry Blossom",
    accent: "#EC4899",
    bubbleMe: "linear-gradient(135deg,#F9A8D4,#F472B6)",
    bubbleThem: "rgba(253,232,240,0.94)",
    textOnMe: "#831843",
    textOnThem: "#831843",
    url: "/Background4.jpg",
    overlay: "rgba(0,0,0,0.08)"
  }),
  photo({
    id: "wp-canvas",
    name: "Rainbow Sky",
    accent: "#5B21B6",
    bubbleMe: "linear-gradient(135deg,#5B21B6,#4C1D95)",
    bubbleThem: "rgba(245,243,255,0.94)",
    textOnMe: "#ffffff",
    textOnThem: "#312E81",
    url: "/Background5.jpg",
    overlay: "rgba(0,0,0,0.14)"
  }),

  // Gradients — bg matches the swatch gradient (Instagram-style)
  gradient(
    "default",
    "Default",
    "#8B5CF6",
    "linear-gradient(135deg,#8B5CF6,#EC4899)",
    ""
  ),
  gradient(
    "sunset",
    "Sunset",
    "#F97316",
    "linear-gradient(135deg,#F97316,#EF4444,#EC4899)",
    "linear-gradient(180deg,#FB923C,#EF4444,#DB2777)"
  ),
  gradient(
    "ocean",
    "Ocean",
    "#06B6D4",
    "linear-gradient(135deg,#06B6D4,#3B82F6,#6366F1)",
    "linear-gradient(180deg,#22D3EE,#3B82F6,#6366F1)"
  ),
  gradient(
    "lavender",
    "Lavender",
    "#A78BFA",
    "linear-gradient(135deg,#A78BFA,#F472B6)",
    "linear-gradient(180deg,#A78BFA,#C084FC,#F472B6)"
  ),
  gradient(
    "cosmos",
    "Cosmos",
    "#8B5CF6",
    "linear-gradient(135deg,#6366F1,#8B5CF6,#EC4899)",
    "linear-gradient(180deg,#312E81,#6D28D9,#BE185D)"
  ),
  gradient(
    "mono",
    "Monochrome",
    "#9CA3AF",
    "linear-gradient(135deg,#1f2937,#374151)",
    "linear-gradient(180deg,#0F172A,#1F2937,#374151)"
  ),

  // Patterns — vector textures over a gradient
  pattern(
    "love",
    "Love",
    "#EC4899",
    "linear-gradient(135deg,#FB7185,#EC4899)",
    "linear-gradient(180deg,#FB7185,#EC4899,#BE185D)",
    HEARTS
  ),
  pattern(
    "galaxy",
    "Galaxy",
    "#6366F1",
    "linear-gradient(135deg,#3B82F6,#6366F1)",
    "linear-gradient(180deg,#0B1024,#312E81,#1D4ED8)",
    STARS
  ),
  pattern(
    "tide",
    "Tide",
    "#06B6D4",
    "linear-gradient(135deg,#0EA5E9,#2563EB)",
    "linear-gradient(180deg,#0E7490,#2563EB,#1E40AF)",
    WAVES
  ),
  pattern(
    "party",
    "Party",
    "#A855F7",
    "linear-gradient(135deg,#A855F7,#EC4899)",
    "linear-gradient(180deg,#7E22CE,#A855F7,#DB2777)",
    CONFETTI
  ),
  pattern(
    "geo",
    "Geo",
    "#10B981",
    "linear-gradient(135deg,#10B981,#0EA5E9)",
    "linear-gradient(180deg,#047857,#10B981,#0EA5E9)",
    TRIANGLES
  ),
  pattern(
    "bubbles",
    "Bubbles",
    "#F59E0B",
    "linear-gradient(135deg,#F59E0B,#F97316)",
    "linear-gradient(180deg,#B45309,#F59E0B,#F97316)",
    BUBBLES
  )
];

export const CUSTOM_THEME_ID = "custom";

const customThemeCache = new Map<string, ChatTheme>();
function buildCustomTheme(img?: string): ChatTheme {
  const key = img ?? "";
  const cached = customThemeCache.get(key);
  if (cached) return cached;
  const theme: ChatTheme = {
    id: CUSTOM_THEME_ID,
    name: "Custom",
    bubbleMe: "linear-gradient(135deg,#8B5CF6,#EC4899)",
    bubbleThem: "rgba(0,0,0,0.32)",
    accent: "#8B5CF6",
    bg: img
      ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url("${img}") center/cover no-repeat`
      : "",
    category: "gradient"
  };
  customThemeCache.set(key, theme);
  return theme;
}

interface State {
  /** Map of chatId -> themeId. Per-chat override of the global theme. */
  byChat: Record<string, string>;
  /** Map of chatId -> custom background image (data URL or URL) */
  customBgByChat: Record<string, string>;
  /** Global default theme id used when a chat has no override. */
  globalTheme: string;
  /** Global custom background image, used when globalTheme === "custom". */
  globalCustomBg?: string;

  setTheme: (chatId: string, themeId: string) => void;
  setCustomBg: (chatId: string, image: string) => void;
  setGlobalTheme: (themeId: string) => void;
  setGlobalCustomBg: (image: string) => void;
  /** Clears per-chat overrides so every chat falls back to the global theme. */
  resetAllChatThemes: () => void;
  customBgFor: (chatId: string) => string | undefined;
  themeFor: (chatId: string) => ChatTheme;
  /** Sync local state from a chats-row payload — used by fetchChats and the
   *  realtime UPDATE listener so both participants stay in lockstep without
   *  re-writing to the DB. */
  hydrateChatTheme: (
    chatId: string,
    themeId: string | null | undefined,
    customBg: string | null | undefined
  ) => void;
}

export const useChatThemeStore = create<State>()(
  persist(
    (set, get) => ({
      byChat: {},
      customBgByChat: {},
      globalTheme: "default",
      globalCustomBg: undefined,
      setTheme: (chatId, themeId) => {
        // Capture previous state for rollback if the DB write fails (most
        // common cause: missing chats UPDATE RLS policy).
        const prev = get().byChat[chatId];
        set((s) => ({ byChat: { ...s.byChat, [chatId]: themeId } }));
        void (async () => {
          const { error } = await supabase
            .from("chats")
            .update({
              theme: themeId,
              ...(themeId === CUSTOM_THEME_ID ? {} : { custom_bg: null })
            })
            .eq("id", chatId);
          if (error) {
            console.error("[setTheme] update failed — theme will revert on reload", {
              message: (error as unknown as { message?: string }).message,
              code: (error as unknown as { code?: string }).code,
              hint: "Run supabase/APPLY_PENDING.sql section 13 to add the chats UPDATE policy."
            });
            set((s) => {
              const nb = { ...s.byChat };
              if (prev) nb[chatId] = prev;
              else delete nb[chatId];
              return { byChat: nb };
            });
          }
        })();
      },
      setCustomBg: (chatId, image) => {
        const prevTheme = get().byChat[chatId];
        const prevBg = get().customBgByChat[chatId];
        set((s) => ({
          customBgByChat: { ...s.customBgByChat, [chatId]: image },
          byChat: { ...s.byChat, [chatId]: CUSTOM_THEME_ID }
        }));
        void (async () => {
          const { error } = await supabase
            .from("chats")
            .update({ theme: CUSTOM_THEME_ID, custom_bg: image })
            .eq("id", chatId);
          if (error) {
            console.error("[setCustomBg] update failed — wallpaper will revert on reload", {
              message: (error as unknown as { message?: string }).message,
              code: (error as unknown as { code?: string }).code,
              hint: "Run supabase/APPLY_PENDING.sql section 13 to add the chats UPDATE policy."
            });
            set((s) => {
              const nbg = { ...s.customBgByChat };
              const nbc = { ...s.byChat };
              if (prevBg) nbg[chatId] = prevBg;
              else delete nbg[chatId];
              if (prevTheme) nbc[chatId] = prevTheme;
              else delete nbc[chatId];
              return { customBgByChat: nbg, byChat: nbc };
            });
          }
        })();
      },
      setGlobalTheme: (themeId) => set({ globalTheme: themeId }),
      setGlobalCustomBg: (image) =>
        set({ globalCustomBg: image, globalTheme: CUSTOM_THEME_ID }),
      resetAllChatThemes: () => set({ byChat: {}, customBgByChat: {} }),
      hydrateChatTheme: (chatId, themeId, customBg) =>
        set((s) => {
          const nextByChat = { ...s.byChat };
          const nextCustom = { ...s.customBgByChat };
          if (themeId) nextByChat[chatId] = themeId;
          else delete nextByChat[chatId];
          if (customBg) nextCustom[chatId] = customBg;
          else delete nextCustom[chatId];
          return { byChat: nextByChat, customBgByChat: nextCustom };
        }),
      customBgFor: (chatId) => get().customBgByChat[chatId],
      themeFor: (chatId) => {
        const state = get();
        const override = state.byChat[chatId];
        if (override) {
          if (override === CUSTOM_THEME_ID) {
            return buildCustomTheme(state.customBgByChat[chatId]);
          }
          const preset = CHAT_THEMES.find((t) => t.id === override);
          if (preset) return preset;
        }
        if (state.globalTheme === CUSTOM_THEME_ID) {
          return buildCustomTheme(state.globalCustomBg);
        }
        return (
          CHAT_THEMES.find((t) => t.id === state.globalTheme) ?? CHAT_THEMES[0]
        );
      }
    }),
    { name: "nova-chat-themes" }
  )
);
