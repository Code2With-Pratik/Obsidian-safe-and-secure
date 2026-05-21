"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentUser } from "@/lib/mock-data";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthed: boolean;
  login: (user?: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthed: false,
      login: (user) => set({ user: user ?? currentUser, isAuthed: true }),
      logout: () => set({ user: null, isAuthed: false })
    }),
    { name: "nova-auth" }
  )
);
