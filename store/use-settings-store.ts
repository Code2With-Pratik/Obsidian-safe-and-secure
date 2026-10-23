"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";
import {
  isCurrentPrivacyRequest,
  rollbackPrivacyValue
} from "@/lib/privacy-behavior";

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
  browser?: string;
  platform?: string;
  current?: boolean;
  deviceFingerprint?: string;
}

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

export const DEFAULT_PRIVACY_PREFS: PrivacyPrefs = {
  readReceipts: true,
  typingIndicator: true,
  lastSeen: false,
  profilePhoto: true,
  allowScreenshots: false
};

export type PrivacySyncStatus = "idle" | "loading" | "ready" | "saving" | "error";

const PRIVACY_COLUMNS: Record<keyof PrivacyPrefs, string> = {
  readReceipts: "read_receipts",
  typingIndicator: "typing_indicator",
  lastSeen: "last_seen",
  profilePhoto: "profile_photo",
  allowScreenshots: "allow_screenshots"
};

const supabase = createClient();
let privacyHydrationToken = 0;
let privacyPendingWrites = 0;

function privacyFromRow(row: Record<string, unknown>): PrivacyPrefs {
  return {
    readReceipts: row.read_receipts !== false,
    typingIndicator: row.typing_indicator !== false,
    lastSeen: row.last_seen === true,
    profilePhoto: row.profile_photo !== false,
    allowScreenshots: row.allow_screenshots === true
  };
}

function announcePrivacyChange(key: keyof PrivacyPrefs, value: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("obsidian:privacy-change", { detail: { key, value } })
  );
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
  privacyUserId: string | null;
  privacyHydrated: boolean;
  privacyStatus: PrivacySyncStatus;
  privacyError: string | null;
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
  hydratePrivacy: (userId: string) => Promise<void>;
  resetPrivacy: () => void;
  togglePrivacy: (key: keyof PrivacyPrefs, v: boolean) => Promise<void>;
  toggleSecurity: (key: keyof SecurityPrefs, v: boolean) => void;
  toggleAi: (key: keyof AiPrefs, v: boolean) => void;
  setLanguage: (code: string) => void;
  setAutoTranslate: (v: boolean) => void;
  setSpellCheck: (v: boolean) => void;
  setDevices: (devices: Device[]) => void;
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
      privacy: { ...DEFAULT_PRIVACY_PREFS },
      privacyUserId: null,
      privacyHydrated: false,
      privacyStatus: "idle",
      privacyError: null,
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

      devices: [],

      setAccent: (id) => set({ accent: id }),
      setFont: (id) => set({ font: id }),
      setGlass: (v) => set({ glass: Math.max(0, Math.min(100, v)) }),
      setReduceMotion: (v) => set({ reduceMotion: v }),
      toggleNotification: (key, v) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: v } })),
      hydratePrivacy: async (userId) => {
        const token = ++privacyHydrationToken;
        privacyPendingWrites = 0;
        set({
          privacy: { ...DEFAULT_PRIVACY_PREFS },
          privacyUserId: userId,
          privacyHydrated: false,
          privacyStatus: "loading",
          privacyError: null
        });

        const { data, error } = await supabase
          .from("user_privacy_settings")
          .upsert({ user_id: userId }, { onConflict: "user_id" })
          .select("read_receipts, typing_indicator, last_seen, profile_photo, allow_screenshots")
          .single();

        if (token !== privacyHydrationToken) return;
        if (error || !data) {
          set({
            privacyStatus: "error",
            privacyHydrated: false,
            privacyError: error?.message ?? "Privacy settings could not be loaded."
          });
          return;
        }
        set({
          privacy: privacyFromRow(data as Record<string, unknown>),
          privacyHydrated: true,
          privacyStatus: "ready",
          privacyError: null
        });
      },
      resetPrivacy: () => {
        privacyHydrationToken++;
        privacyPendingWrites = 0;
        set({
          privacy: { ...DEFAULT_PRIVACY_PREFS },
          privacyUserId: null,
          privacyHydrated: false,
          privacyStatus: "idle",
          privacyError: null
        });
      },
      togglePrivacy: async (key, v) => {
        const state = useSettingsStore.getState();
        const userId = state.privacyUserId;
        const wasHydrated = state.privacyHydrated;
        const previous = state.privacy[key];
        if (previous === v) return;

        privacyPendingWrites++;
        set((s) => ({
          privacy: { ...s.privacy, [key]: v },
          privacyStatus: "saving",
          privacyError: null
        }));
        announcePrivacyChange(key, v);

        if (!userId) {
          privacyPendingWrites--;
          set((s) => ({
            privacy: { ...s.privacy, [key]: previous },
            privacyStatus: "error",
            privacyError: "Sign in again to save privacy settings."
          }));
          announcePrivacyChange(key, previous);
          return;
        }

        const update = {
          user_id: userId,
          [PRIVACY_COLUMNS[key]]: v
        };
        const { error } = await supabase
          .from("user_privacy_settings")
          .upsert(update, { onConflict: "user_id" });

        // Disabling last-seen also erases the previously published value.
        // The masked public profile view protects peers immediately even if
        // this best-effort cleanup request is delayed.
        if (!error && key === "lastSeen" && !v) {
          await supabase.from("profiles").update({ last_seen_at: null }).eq("id", userId);
        }

        if (!isCurrentPrivacyRequest(useSettingsStore.getState().privacyUserId, userId)) return;
        privacyPendingWrites--;
        if (error) {
          set((s) => ({
            privacy: rollbackPrivacyValue(s.privacy, key, v, previous),
            privacyStatus: "error",
            privacyError: "Privacy change was not saved. Please try again."
          }));
          announcePrivacyChange(key, previous);
          return;
        }
        if (!wasHydrated) {
          // A toggle can be the successful retry after initial hydration
          // failed. Reload the full row before enabling any disclosures.
          await useSettingsStore.getState().hydratePrivacy(userId);
          return;
        }
        set({
          privacyStatus: privacyPendingWrites > 0 ? "saving" : "ready",
          privacyError: null
        });
      },
      toggleSecurity: (key, v) =>
        set((s) => ({ security: { ...s.security, [key]: v } })),
      toggleAi: (key, v) => set((s) => ({ ai: { ...s.ai, [key]: v } })),
      setLanguage: (code) => set({ language: code }),
      setAutoTranslate: (v) => set({ autoTranslate: v }),
      setSpellCheck: (v) => set({ spellCheck: v }),
      setDevices: (devices) => set({ devices })
    }),
    {
      name: "nova-settings",
      version: 2,
      migrate: (persisted) => {
        const value = (persisted ?? {}) as Record<string, unknown>;
        const {
          privacy: _privacy,
          privacyUserId: _privacyUserId,
          privacyStatus: _privacyStatus,
          privacyHydrated: _privacyHydrated,
          privacyError: _privacyError,
          ...safeSettings
        } = value;
        return safeSettings;
      },
      partialize: (state) => ({
        accent: state.accent,
        font: state.font,
        glass: state.glass,
        reduceMotion: state.reduceMotion,
        notifications: state.notifications,
        security: state.security,
        ai: state.ai,
        language: state.language,
        autoTranslate: state.autoTranslate,
        spellCheck: state.spellCheck,
        devices: state.devices
      })
    }
  )
);
