"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* -------------------------------------------------------- */
/* Accent palette                                           */
/* -------------------------------------------------------- */
/** Each accent maps to an HSL triple (the format our CSS `--primary`/`--ring`
 *  tokens use) plus a hex for swatches. Selecting one rewrites those CSS
 *  variables app-wide via SettingsEffects. */
export interface Accent {
  id: string;
  name: string;
  hex: string;
  /** "H S% L%" — assigned straight into `--primary` / `--ring`. */
  hsl: string;
}

export const ACCENTS: Accent[] = [
  { id: "violet", name: "Aurora Violet", hex: "#8B5CF6", hsl: "258 90% 66%" },
  { id: "cyan", name: "Neon Cyan", hex: "#22D3EE", hsl: "187 85% 53%" },
  { id: "pink", name: "Synth Pink", hex: "#EC4899", hsl: "330 81% 60%" },
  { id: "lime", name: "Voltage Lime", hex: "#A3E635", hsl: "83 78% 55%" },
  { id: "amber", name: "Solar Amber", hex: "#FBBF24", hsl: "43 96% 56%" }
];

/* -------------------------------------------------------- */
/* Languages                                                */
/* -------------------------------------------------------- */
export interface Language {
  code: string;
  label: string;
  native: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English (US)", flag: "🇺🇸" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "mr", label: "Marathi", native: "मराठी", flag: "🇮🇳" },
  { code: "ar", label: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "tr", label: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "pt", label: "Portuguese", native: "Português", flag: "🇵🇹" },
  { code: "zh", label: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "ja", label: "Japanese", native: "日本語", flag: "🇯🇵" }
];

/* -------------------------------------------------------- */
/* Devices                                                  */
/* -------------------------------------------------------- */
export type DeviceKind = "laptop" | "phone" | "tablet" | "monitor";

export interface Device {
  id: string;
  kind: DeviceKind;
  name: string;
  location: string;
  lastActive: string;
  /** The current device can't be signed out from here. */
  current?: boolean;
}

const SEED_DEVICES: Device[] = [
  { id: "d-mac", kind: "laptop", name: "MacBook Pro", location: "Lisbon, PT", lastActive: "Active now", current: true },
  { id: "d-iphone", kind: "phone", name: "iPhone 17 Pro", location: "Lisbon, PT", lastActive: "2 min ago" },
  { id: "d-ipad", kind: "tablet", name: "iPad Air", location: "Lisbon, PT", lastActive: "Yesterday" },
  { id: "d-display", kind: "monitor", name: "Studio Display", location: "Office", lastActive: "3 days ago" }
];

/* -------------------------------------------------------- */
/* Toggle groups                                            */
/* -------------------------------------------------------- */
export interface NotificationPrefs {
  directMessages: boolean;
  groupChats: boolean;
  ghostRooms: boolean;
  callInvites: boolean;
  sounds: boolean;
}

export interface PrivacyPrefs {
  readReceipts: boolean;
  typingIndicator: boolean;
  lastSeen: boolean;
  profilePhoto: boolean;
  allowScreenshots: boolean;
}

export interface SecurityPrefs {
  twoFactor: boolean;
  biometric: boolean;
  loginAlerts: boolean;
  autoLockVault: boolean;
}

export interface AiPrefs {
  onDeviceSuggestions: boolean;
  cloudAssist: boolean;
  readConversations: boolean;
  voiceCloning: boolean;
}

interface SettingsState {
  /* ---- appearance ---- */
  accent: string;
  /** Selected UI font id (see FONT_OPTIONS in app/fonts). "default" = Inter. */
  font: string;
  /** Glass intensity 0–100 (80 ≈ the original default). */
  glass: number;
  reduceMotion: boolean;

  /* ---- toggle groups ---- */
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
  security: SecurityPrefs;
  ai: AiPrefs;

  /* ---- language / region ---- */
  language: string;
  autoTranslate: boolean;
  spellCheck: boolean;

  /* ---- devices ---- */
  devices: Device[];

  /* ---- actions ---- */
  setAccent: (id: string) => void;
  setFont: (id: string) => void;
  setGlass: (v: number) => void;
  setReduceMotion: (v: boolean) => void;
  toggleNotification: (key: keyof NotificationPrefs, v: boolean) => void;
  togglePrivacy: (key: keyof PrivacyPrefs, v: boolean) => void;
  toggleSecurity: (key: keyof SecurityPrefs, v: boolean) => void;
  toggleAi: (key: keyof AiPrefs, v: boolean) => void;
  setLanguage: (code: string) => void;
  setAutoTranslate: (v: boolean) => void;
  setSpellCheck: (v: boolean) => void;
  signOutDevice: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      accent: "violet",
      font: "arima",
      glass: 80,
      reduceMotion: false,

      notifications: {
        directMessages: true,
        groupChats: true,
        ghostRooms: false,
        callInvites: true,
        sounds: true
      },
      privacy: {
        readReceipts: true,
        typingIndicator: true,
        lastSeen: false,
        profilePhoto: true,
        allowScreenshots: false
      },
      security: {
        twoFactor: true,
        biometric: true,
        loginAlerts: true,
        autoLockVault: true
      },
      ai: {
        onDeviceSuggestions: true,
        cloudAssist: true,
        readConversations: false,
        voiceCloning: false
      },

      language: "en",
      autoTranslate: true,
      spellCheck: true,

      devices: SEED_DEVICES,

      setAccent: (id) => set({ accent: id }),
      setFont: (id) => set({ font: id }),
      setGlass: (v) => set({ glass: Math.max(0, Math.min(100, v)) }),
      setReduceMotion: (v) => set({ reduceMotion: v }),
      toggleNotification: (key, v) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: v } })),
      togglePrivacy: (key, v) =>
        set((s) => ({ privacy: { ...s.privacy, [key]: v } })),
      toggleSecurity: (key, v) =>
        set((s) => ({ security: { ...s.security, [key]: v } })),
      toggleAi: (key, v) => set((s) => ({ ai: { ...s.ai, [key]: v } })),
      setLanguage: (code) => set({ language: code }),
      setAutoTranslate: (v) => set({ autoTranslate: v }),
      setSpellCheck: (v) => set({ spellCheck: v }),
      signOutDevice: (id) =>
        set((s) => ({ devices: s.devices.filter((d) => d.id !== id || d.current) }))
    }),
    { name: "nova-settings" }
  )
);
