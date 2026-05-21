"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatTheme {
  id: string;
  name: string;
  bubbleMe: string; // gradient
  bubbleThem: string; // glass tint
  accent: string; // hex/css
  bg: string; // canvas background
  textOnBubbleMe?: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: "default",
    name: "Default",
    bubbleMe: "linear-gradient(135deg,#8B5CF6,#EC4899)",
    bubbleThem: "hsla(0,0%,100%,0.06)",
    accent: "#8B5CF6",
    bg: ""
  },
  {
    id: "sunset",
    name: "Sunset",
    bubbleMe: "linear-gradient(135deg,#F97316,#EF4444,#EC4899)",
    bubbleThem: "hsla(20,90%,90%,0.08)",
    accent: "#F97316",
    bg: "radial-gradient(120% 90% at 80% 0%, rgba(249,115,22,0.16), transparent 60%), radial-gradient(80% 70% at 0% 100%, rgba(236,72,153,0.16), transparent 60%)"
  },
  {
    id: "ocean",
    name: "Ocean",
    bubbleMe: "linear-gradient(135deg,#06B6D4,#3B82F6,#6366F1)",
    bubbleThem: "hsla(200,80%,90%,0.08)",
    accent: "#06B6D4",
    bg: "radial-gradient(120% 90% at 80% 0%, rgba(6,182,212,0.18), transparent 60%), radial-gradient(80% 70% at 0% 100%, rgba(59,130,246,0.16), transparent 60%)"
  },
  {
    id: "forest",
    name: "Forest",
    bubbleMe: "linear-gradient(135deg,#10B981,#22D3EE)",
    bubbleThem: "hsla(160,60%,90%,0.08)",
    accent: "#10B981",
    bg: "radial-gradient(120% 90% at 80% 0%, rgba(16,185,129,0.16), transparent 60%), radial-gradient(80% 70% at 0% 100%, rgba(34,211,238,0.14), transparent 60%)"
  },
  {
    id: "lavender",
    name: "Lavender",
    bubbleMe: "linear-gradient(135deg,#A78BFA,#F472B6)",
    bubbleThem: "hsla(270,60%,90%,0.08)",
    accent: "#A78BFA",
    bg: "radial-gradient(120% 90% at 80% 0%, rgba(167,139,250,0.16), transparent 60%), radial-gradient(80% 70% at 0% 100%, rgba(244,114,182,0.14), transparent 60%)"
  },
  {
    id: "citrus",
    name: "Citrus",
    bubbleMe: "linear-gradient(135deg,#FBBF24,#F59E0B,#A3E635)",
    bubbleThem: "hsla(50,90%,90%,0.08)",
    accent: "#FBBF24",
    bg: "radial-gradient(120% 90% at 80% 0%, rgba(251,191,36,0.16), transparent 60%), radial-gradient(80% 70% at 0% 100%, rgba(163,230,53,0.14), transparent 60%)"
  },
  {
    id: "cosmos",
    name: "Cosmos",
    bubbleMe: "linear-gradient(135deg,#6366F1,#8B5CF6,#EC4899)",
    bubbleThem: "hsla(260,40%,80%,0.08)",
    accent: "#8B5CF6",
    bg: "radial-gradient(120% 90% at 80% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(80% 70% at 0% 100%, rgba(236,72,153,0.16), transparent 60%), radial-gradient(60% 60% at 50% 50%, rgba(139,92,246,0.10), transparent 70%)"
  },
  {
    id: "mono",
    name: "Monochrome",
    bubbleMe: "linear-gradient(135deg,#1f2937,#374151)",
    bubbleThem: "hsla(0,0%,100%,0.05)",
    accent: "#9CA3AF",
    bg: ""
  },
  {
    id: "rose",
    name: "Rose Gold",
    bubbleMe: "linear-gradient(135deg,#FB7185,#F472B6)",
    bubbleThem: "hsla(340,60%,90%,0.08)",
    accent: "#FB7185",
    bg: "radial-gradient(120% 90% at 80% 0%, rgba(251,113,133,0.16), transparent 60%)"
  },
  {
    id: "midnight",
    name: "Midnight",
    bubbleMe: "linear-gradient(135deg,#1E1B4B,#312E81,#0EA5E9)",
    bubbleThem: "hsla(220,40%,80%,0.06)",
    accent: "#0EA5E9",
    bg: "radial-gradient(120% 90% at 80% 0%, rgba(14,165,233,0.12), transparent 60%), radial-gradient(80% 70% at 0% 100%, rgba(99,102,241,0.18), transparent 60%)"
  }
];

interface State {
  /** Map of chatId -> themeId */
  byChat: Record<string, string>;
  setTheme: (chatId: string, themeId: string) => void;
  themeFor: (chatId: string) => ChatTheme;
}

export const useChatThemeStore = create<State>()(
  persist(
    (set, get) => ({
      byChat: {},
      setTheme: (chatId, themeId) =>
        set((s) => ({ byChat: { ...s.byChat, [chatId]: themeId } })),
      themeFor: (chatId) => {
        const id = get().byChat[chatId] ?? "default";
        return CHAT_THEMES.find((t) => t.id === id) ?? CHAT_THEMES[0];
      }
    }),
    { name: "nova-chat-themes" }
  )
);
