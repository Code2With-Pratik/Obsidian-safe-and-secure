"use client";

import { create } from "zustand";
import { stories as seedStories } from "@/lib/mock-data";

/** One frame of a user's story reel. */
export interface StorySlide {
  id: string;
  kind: "image" | "text";
  /** Image src (remote URL or data URL from the editor export). */
  src?: string;
  /** Gradient background for text slides. */
  bg?: string;
  text?: string;
  /** Epoch ms the slide was posted — drives the "2h ago" label. */
  postedAt: number;
}

export interface UserStories {
  userId: string;
  slides: StorySlide[];
  /** Whether the current viewer has already watched this reel (dims the ring). */
  viewed: boolean;
}

interface StoriesState {
  byUser: Record<string, UserStories>;
  /** User whose reel is open in the full-screen viewer (null = closed). */
  viewerUserId: string | null;
  /** User whose "story or profile?" prompt is open (null = closed). */
  promptUserId: string | null;

  addStory: (userId: string, slide: Omit<StorySlide, "id" | "postedAt"> & { postedAt?: number }) => void;
  markViewed: (userId: string) => void;
  openPrompt: (userId: string) => void;
  closePrompt: () => void;
  openViewer: (userId: string) => void;
  closeViewer: () => void;
  hasStory: (userId: string) => boolean;
}

const slideId = () =>
  `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Group the mock `stories` array into per-user reels. */
function seed(): Record<string, UserStories> {
  const map: Record<string, UserStories> = {};
  for (const s of seedStories) {
    const slide: StorySlide = {
      id: s.id,
      kind: s.type === "text" ? "text" : "image",
      src: s.type === "text" ? undefined : s.preview,
      bg: s.bg,
      text: s.text,
      postedAt: Date.parse(s.postedAt) || Date.now()
    };
    const existing = map[s.authorId];
    if (existing) {
      existing.slides.push(slide);
      if (!s.viewed) existing.viewed = false;
    } else {
      map[s.authorId] = { userId: s.authorId, slides: [slide], viewed: !!s.viewed };
    }
  }
  return map;
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  byUser: seed(),
  viewerUserId: null,
  promptUserId: null,

  addStory: (userId, slide) =>
    set((st) => {
      const next: StorySlide = {
        id: slideId(),
        postedAt: slide.postedAt ?? Date.now(),
        kind: slide.kind,
        src: slide.src,
        bg: slide.bg,
        text: slide.text
      };
      const existing = st.byUser[userId];
      const entry: UserStories = existing
        ? { ...existing, slides: [...existing.slides, next], viewed: false }
        : { userId, slides: [next], viewed: false };
      return { byUser: { ...st.byUser, [userId]: entry } };
    }),

  markViewed: (userId) =>
    set((st) => {
      const e = st.byUser[userId];
      if (!e || e.viewed) return {};
      return { byUser: { ...st.byUser, [userId]: { ...e, viewed: true } } };
    }),

  openPrompt: (userId) => set({ promptUserId: userId }),
  closePrompt: () => set({ promptUserId: null }),
  openViewer: (userId) => set({ viewerUserId: userId, promptUserId: null }),
  closeViewer: () => set({ viewerUserId: null }),

  hasStory: (userId) => !!get().byUser[userId]?.slides.length
}));
