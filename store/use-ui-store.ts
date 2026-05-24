"use client";

import { create } from "zustand";

export interface ActiveCall {
  chatId: string;
  name: string;
  avatar?: string;
  video: boolean;
  /** true if the originating chat is a group/channel rather than a 1-on-1 DM. */
  group?: boolean;
  /** number of participants when known — drives the group call grid layout. */
  participants?: number;
  /** route to send the user back to when the call ends (defaults to the chat). */
  returnTo?: string;
  startedAt: number;
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;

  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;

  aiAssistantOpen: boolean;
  toggleAiAssistant: () => void;
  setAiAssistantOpen: (v: boolean) => void;

  /** non-null while a call is connected (full-screen or minimized) */
  activeCall: ActiveCall | null;
  startCall: (c: Omit<ActiveCall, "startedAt">) => void;
  endCall: () => void;

  miniCallOpen: boolean;
  setMiniCallOpen: (v: boolean) => void;

  rightPanel: "details" | "thread" | "files" | "members" | null;
  setRightPanel: (p: UIState["rightPanel"]) => void;

  splitMode: boolean;
  setSplitMode: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebar: (v) => set({ sidebarCollapsed: v }),

  commandOpen: false,
  setCommandOpen: (v) => set({ commandOpen: v }),

  aiAssistantOpen: false,
  toggleAiAssistant: () => set((s) => ({ aiAssistantOpen: !s.aiAssistantOpen })),
  setAiAssistantOpen: (v) => set({ aiAssistantOpen: v }),

  activeCall: null,
  startCall: (c) => set({ activeCall: { ...c, startedAt: Date.now() }, miniCallOpen: false }),
  endCall: () => set({ activeCall: null, miniCallOpen: false }),

  miniCallOpen: false,
  setMiniCallOpen: (v) => set({ miniCallOpen: v }),

  rightPanel: "details",
  setRightPanel: (p) => set({ rightPanel: p }),

  splitMode: false,
  setSplitMode: (v) => set({ splitMode: v })
}));
