"use client";

import { create } from "zustand";

interface State {
  /** Map of chatId → Set of selected message ids. */
  selected: Record<string, string[]>;
  /** Begin selection mode in `chatId` with `messageId` already selected. */
  startWith: (chatId: string, messageId: string) => void;
  /** Toggle a message in the selection for `chatId`. */
  toggle: (chatId: string, messageId: string) => void;
  /** Clear all selections for `chatId`. */
  clear: (chatId: string) => void;
  /** Whether selection mode is active for `chatId`. */
  isActive: (chatId: string) => boolean;
}

export const useMessageSelectionStore = create<State>((set, get) => ({
  selected: {},
  startWith: (chatId, messageId) =>
    set((s) => ({ selected: { ...s.selected, [chatId]: [messageId] } })),
  toggle: (chatId, messageId) =>
    set((s) => {
      const current = s.selected[chatId] ?? [];
      const next = current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId];
      return { selected: { ...s.selected, [chatId]: next } };
    }),
  clear: (chatId) =>
    set((s) => {
      if (!s.selected[chatId]?.length) return s;
      const { [chatId]: _removed, ...rest } = s.selected;
      return { selected: rest };
    }),
  isActive: (chatId) => (get().selected[chatId]?.length ?? 0) > 0
}));
