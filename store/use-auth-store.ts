"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthed: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  /** Mark the session as authed (called from the 2FA page once the code is
   *  verified). The real user object is set separately by the auth-listener
   *  after Supabase reports SIGNED_IN. */
  login: () => void;
  updateUser: (patch: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthed: false,
      setUser: (user) => set({ user, isAuthed: !!user }),
      logout: () => set({ user: null, isAuthed: false }),
      login: () => set({ isAuthed: true }),
      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s))
    }),
    { name: "nova-auth" }
  )
);
