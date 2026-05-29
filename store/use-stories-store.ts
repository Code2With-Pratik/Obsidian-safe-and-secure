"use client";

import { create } from "zustand";
import { stories as seedStories } from "@/lib/mock-data";

/** A music sticker carried live on a slide (so it can spin / play in the
 *  viewer instead of being baked flat into the exported image). */
export interface StoryMusic {
  title: string;
  artist: string;
  cover?: string;
  /** 30s preview mp3 — auto-plays in the viewer, Instagram-style. */
  preview?: string;
  variant: "card" | "square" | "circle" | "note";
  /** Center position + transform, as captured in the editor. */
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

/** An image/GIF overlay rendered LIVE (as an <img>) in the viewer instead of
 *  being flattened into the static PNG — so animated GIFs keep playing. */
export interface StoryOverlay {
  id: string;
  src: string;
  /** Center position as a % of the canvas. */
  x: number;
  y: number;
  /** Size as a % of the canvas width / height (preserves aspect across the
   *  editor and viewer canvases, which share the 9:16 ratio). */
  wPct: number;
  hPct: number;
  scale: number;
  rotate: number;
  /** Resolved CSS filter string (so the viewer needn't know filter ids). */
  filter?: string;
}

/** One frame of a user's story reel. */
export interface StorySlide {
  id: string;
  kind: "image" | "text";
  /** Image src (remote URL or data URL from the editor export). */
  src?: string;
  /** Gradient background for text slides. */
  bg?: string;
  text?: string;
  /** Epoch ms the slide was posted — drives the "2h ago" label + 24h expiry. */
  postedAt: number;
  /** Optional live music overlay (spins / plays in the viewer). */
  music?: StoryMusic;
  /** Live image/GIF overlays (animate in the viewer). */
  overlays?: StoryOverlay[];
}

export interface UserStories {
  userId: string;
  slides: StorySlide[];
  /** Whether the current viewer has already watched this reel (dims the ring). */
  viewed: boolean;
  /** Whether the current user has liked this reel (others' stories only). */
  likedByMe?: boolean;
}

/** Stories live for 24h after posting, then disappear. */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
export const isFreshStory = (postedAt: number) => Date.now() - postedAt < STORY_TTL_MS;

interface StoriesState {
  byUser: Record<string, UserStories>;
  /** User whose reel is open in the full-screen viewer (null = closed). */
  viewerUserId: string | null;
  /** User whose "story or profile?" prompt is open (null = closed). */
  promptUserId: string | null;
  /** User whose profile photo is open in the enlarged viewer (null = closed). */
  photoUserId: string | null;
  /** A story being "uploaded" — drives the progress bar in the chat-list
   *  header. `slide` is null while the canvas is still composing in the
   *  background; once attached AND the bar reaches 100% it's committed. */
  pendingStory:
    | {
        userId: string;
        slide: (Omit<StorySlide, "id" | "postedAt"> & { postedAt?: number }) | null;
      }
    | null;

  addStory: (userId: string, slide: Omit<StorySlide, "id" | "postedAt"> & { postedAt?: number }) => void;
  markViewed: (userId: string) => void;
  openPrompt: (userId: string) => void;
  closePrompt: () => void;
  openViewer: (userId: string) => void;
  closeViewer: () => void;
  openPhoto: (userId: string) => void;
  closePhoto: () => void;
  /** Begin the upload animation (slide attached later once composed). */
  startStoryUpload: (userId: string) => void;
  /** Attach the composed slide to the in-flight upload. */
  attachStorySlide: (slide: Omit<StorySlide, "id" | "postedAt"> & { postedAt?: number }) => void;
  clearPendingStory: () => void;
  /** Like / unlike another user's reel. */
  toggleLike: (userId: string) => void;
  /** Drop slides (and empty reels) older than 24h. */
  pruneExpired: () => void;
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
  photoUserId: null,
  pendingStory: null,

  addStory: (userId, slide) =>
    set((st) => {
      const next: StorySlide = {
        id: slideId(),
        postedAt: slide.postedAt ?? Date.now(),
        kind: slide.kind,
        src: slide.src,
        bg: slide.bg,
        text: slide.text,
        music: slide.music,
        overlays: slide.overlays
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
  openPhoto: (userId) => set({ photoUserId: userId, promptUserId: null }),
  closePhoto: () => set({ photoUserId: null }),
  startStoryUpload: (userId) => set({ pendingStory: { userId, slide: null } }),
  attachStorySlide: (slide) =>
    set((st) => (st.pendingStory ? { pendingStory: { ...st.pendingStory, slide } } : {})),
  clearPendingStory: () => set({ pendingStory: null }),

  toggleLike: (userId) =>
    set((st) => {
      const e = st.byUser[userId];
      if (!e) return {};
      return { byUser: { ...st.byUser, [userId]: { ...e, likedByMe: !e.likedByMe } } };
    }),

  pruneExpired: () =>
    set((st) => {
      let changed = false;
      const next: Record<string, UserStories> = {};
      for (const [uid, reel] of Object.entries(st.byUser)) {
        const fresh = reel.slides.filter((s) => isFreshStory(s.postedAt));
        if (fresh.length === 0) {
          changed = true; // whole reel expired → drop it
          continue;
        }
        if (fresh.length !== reel.slides.length) changed = true;
        next[uid] = fresh.length === reel.slides.length ? reel : { ...reel, slides: fresh };
      }
      return changed ? { byUser: next } : {};
    }),

  hasStory: (userId) => !!get().byUser[userId]?.slides.length
}));
