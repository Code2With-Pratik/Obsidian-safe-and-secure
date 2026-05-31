"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentUser } from "@/lib/mock-data";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthed: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthed: false,
      setUser: (user) => set({ user, isAuthed: !!user }),
      logout: () => set({ user: null, isAuthed: false }),
      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s))
    }),
    { name: "nova-auth" }
  )
);
