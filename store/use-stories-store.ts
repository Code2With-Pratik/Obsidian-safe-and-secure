"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useAuthStore } from "@/store/use-auth-store";
import { useChatStore } from "@/store/use-chat-store";

const supabase = createClient();

/** A music sticker carried live on a slide. */
export interface StoryMusic {
  title: string;
  artist: string;
  cover?: string;
  preview?: string;
  variant: "card" | "square" | "circle" | "note";
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

/** Live image/GIF overlay rendered as <img> instead of baked into the PNG. */
export interface StoryOverlay {
  id: string;
  src: string;
  x: number;
  y: number;
  wPct: number;
  hPct: number;
  scale: number;
  rotate: number;
  filter?: string;
}

export interface StorySlide {
  id: string;
  kind: "image" | "text";
  src?: string;
  bg?: string;
  text?: string;
  postedAt: number;
  music?: StoryMusic;
  overlays?: StoryOverlay[];
}

export interface UserStories {
  userId: string;
  slides: StorySlide[];
  /** Whether the current viewer has already watched this reel (dims the ring). */
  viewed: boolean;
  /** Whether the current user has liked any slide in this reel. */
  likedByMe?: boolean;
}

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
export const isFreshStory = (postedAt: number) => Date.now() - postedAt < STORY_TTL_MS;

interface StoryRow {
  id: string;
  author_id: string;
  type: "image" | "video" | "text";
  content_url: string | null;
  bg_gradient: string | null;
  text_content: string | null;
  created_at: string;
  expires_at: string;
  metadata: { music?: StoryMusic; overlays?: StoryOverlay[] } | null;
}

interface ViewRow {
  story_id: string;
  user_id: string;
}

interface LikeRow {
  story_id: string;
  user_id: string;
}

/** Minimal profile cache so the viewer/rail/popups can render the author's
 *  name + avatar without each call site re-fetching. Populated by fetchStories
 *  and topped up on realtime inserts. */
export interface StoryProfile {
  id: string;
  name?: string;
  username?: string;
  avatar?: string;
}

interface StoriesState {
  byUser: Record<string, UserStories>;
  profiles: Record<string, StoryProfile>;
  viewerUserId: string | null;
  promptUserId: string | null;
  photoUserId: string | null;
  pendingStory:
    | {
        userId: string;
        slide: (Omit<StorySlide, "id" | "postedAt"> & { postedAt?: number }) | null;
      }
    | null;
  storyChannel: RealtimeChannel | null;

  /** Pull every non-expired story + my views + my likes from Supabase. */
  fetchStories: () => Promise<void>;
  /** Compose + persist a story slide. Uploads the image data URL (if any) to
   *  the chat-attachments bucket so peers can fetch it. Returns the new
   *  story's database id on success. */
  addStory: (
    slide: Omit<StorySlide, "id" | "postedAt"> & { postedAt?: number }
  ) => Promise<string | null>;
  /** Mark another user's reel as viewed (writes one row per slide). */
  markViewed: (userId: string) => Promise<void>;
  /** Toggle a like on the currently-open slide for a given user reel. */
  toggleLike: (userId: string, slideId: string) => Promise<void>;
  /** Send a story reply as a DM to the author with a thumbnail of the slide. */
  replyToStory: (
    storyAuthorId: string,
    slide: StorySlide,
    content: string
  ) => Promise<void>;
  /** Lookup tables for the author's "Viewers"/"Likers" sheets. */
  getStoryViewers: (
    storyId: string
  ) => Promise<Array<{ id: string; name?: string; username?: string; avatar?: string }>>;
  getStoryLikers: (
    storyId: string
  ) => Promise<Array<{ id: string; name?: string; username?: string; avatar?: string }>>;

  openPrompt: (userId: string) => void;
  closePrompt: () => void;
  openViewer: (userId: string) => void;
  closeViewer: () => void;
  openPhoto: (userId: string) => void;
  closePhoto: () => void;
  startStoryUpload: (userId: string) => void;
  attachStorySlide: (
    slide: Omit<StorySlide, "id" | "postedAt"> & { postedAt?: number }
  ) => void;
  clearPendingStory: () => void;
  pruneExpired: () => void;
  hasStory: (userId: string) => boolean;

  initializeRealtime: () => void;
  disconnectRealtime: () => void;
}

const slideIdFor = (storyId: string) => `slide-${storyId}`;

function rowToSlide(r: StoryRow): StorySlide {
  const meta = r.metadata || {};
  return {
    id: slideIdFor(r.id),
    kind: r.type === "text" ? "text" : "image",
    src: r.type === "text" ? undefined : r.content_url ?? undefined,
    bg: r.bg_gradient ?? undefined,
    text: r.text_content ?? undefined,
    postedAt: new Date(r.created_at).getTime(),
    music: meta.music,
    overlays: meta.overlays
  };
}

/** Try to upload a story image to chat-attachments and return its public URL.
 *  Falls back to the original data URL on failure so the author still sees
 *  their own slide locally even if the upload fails. */
async function uploadStoryImage(dataUrl: string): Promise<string | null> {
  try {
    const me = useAuthStore.getState().user;
    if (!me) return null;
    if (!dataUrl.startsWith("data:")) return dataUrl;
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const ext = blob.type.includes("png") ? "png" : blob.type.includes("jpeg") ? "jpg" : "png";
    const path = `${me.id}/story-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: blob.type || `image/${ext}`
      });
    if (error || !data) {
      console.error("[uploadStoryImage] failed", error);
      return null;
    }
    const { data: pub } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(data.path);
    return pub.publicUrl;
  } catch (err) {
    console.error("[uploadStoryImage] exception", err);
    return null;
  }
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  byUser: {},
  profiles: {},
  viewerUserId: null,
  promptUserId: null,
  photoUserId: null,
  pendingStory: null,
  storyChannel: null,

  fetchStories: async () => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const nowIso = new Date().toISOString();
    const [storiesRes, viewsRes, likesRes] = await Promise.all([
      supabase
        .from("stories")
        .select("*")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: true }),
      supabase
        .from("story_views")
        .select("story_id, user_id")
        .eq("user_id", me.id),
      supabase
        .from("story_likes")
        .select("story_id, user_id")
        .eq("user_id", me.id)
    ]);
    const rows = (storiesRes.data || []) as StoryRow[];
    const myViews = new Set((viewsRes.data || []).map((r: ViewRow) => r.story_id));
    const myLikes = new Set((likesRes.data || []).map((r: LikeRow) => r.story_id));
    // Populate the profile cache so the rail/viewer/popups can render names
    // and avatars without each call site running its own fetch.
    const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
    let profileMap: Record<string, StoryProfile> = {};
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, username, avatar")
        .in("id", authorIds);
      (profs || []).forEach((p: StoryProfile) => {
        profileMap[p.id] = p;
      });
    }
    // Also keep our own profile around so MyStoryBar / sidebar can find it.
    if (!profileMap[me.id]) {
      profileMap[me.id] = {
        id: me.id,
        name: me.name,
        username: me.username,
        avatar: me.avatar
      };
    }
    const next: Record<string, UserStories> = {};
    rows.forEach((r) => {
      const slide = rowToSlide(r);
      const existing = next[r.author_id];
      const isViewedSlide = myViews.has(r.id);
      const isLikedSlide = myLikes.has(r.id);
      if (existing) {
        existing.slides.push(slide);
        if (!isViewedSlide) existing.viewed = false;
        if (isLikedSlide) existing.likedByMe = true;
      } else {
        next[r.author_id] = {
          userId: r.author_id,
          slides: [slide],
          viewed: isViewedSlide,
          likedByMe: isLikedSlide
        };
      }
    });
    set({ byUser: next, profiles: { ...get().profiles, ...profileMap } });
  },

  addStory: async (slide) => {
    const me = useAuthStore.getState().user;
    if (!me) return null;
    // Upload the composed image to storage so peers can fetch it.
    let contentUrl: string | null = null;
    if (slide.kind === "image" && slide.src) {
      contentUrl = await uploadStoryImage(slide.src);
    }
    const metadata = {
      music: slide.music,
      overlays: slide.overlays
    };
    const { data, error } = await supabase
      .from("stories")
      .insert({
        author_id: me.id,
        type: slide.kind === "text" ? "text" : "image",
        content_url: contentUrl,
        bg_gradient: slide.bg ?? null,
        text_content: slide.text ?? null,
        metadata
      })
      .select("*")
      .single<StoryRow>();
    if (error || !data) {
      console.error("[addStory] insert failed", error);
      // Still optimistically show the author their own slide.
      const local: StorySlide = {
        id: slide.kind === "text" ? `local-${Date.now()}` : `local-${Date.now()}`,
        kind: slide.kind,
        src: slide.src,
        bg: slide.bg,
        text: slide.text,
        postedAt: slide.postedAt ?? Date.now(),
        music: slide.music,
        overlays: slide.overlays
      };
      set((st) => {
        const existing = st.byUser[me.id];
        const entry: UserStories = existing
          ? { ...existing, slides: [...existing.slides, local], viewed: false }
          : { userId: me.id, slides: [local], viewed: false };
        return { byUser: { ...st.byUser, [me.id]: entry } };
      });
      return null;
    }
    const next = rowToSlide(data);
    set((st) => {
      const existing = st.byUser[me.id];
      const entry: UserStories = existing
        ? { ...existing, slides: [...existing.slides, next], viewed: false }
        : { userId: me.id, slides: [next], viewed: false };
      return { byUser: { ...st.byUser, [me.id]: entry } };
    });
    return data.id;
  },

  markViewed: async (userId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const reel = get().byUser[userId];
    if (!reel) return;
    // Optimistic local update.
    set((st) => {
      const e = st.byUser[userId];
      if (!e || e.viewed) return {};
      return { byUser: { ...st.byUser, [userId]: { ...e, viewed: true } } };
    });
    const storyIds = reel.slides
      .map((s) => (s.id.startsWith("slide-") ? s.id.slice("slide-".length) : null))
      .filter((x): x is string => !!x);
    if (storyIds.length === 0) return;
    await supabase
      .from("story_views")
      .upsert(
        storyIds.map((sid) => ({ story_id: sid, user_id: me.id })),
        { onConflict: "story_id,user_id", ignoreDuplicates: true }
      );
  },

  toggleLike: async (userId, slideId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const reel = get().byUser[userId];
    if (!reel) return;
    const slide = reel.slides.find((s) => s.id === slideId);
    if (!slide) return;
    const storyId = slide.id.startsWith("slide-") ? slide.id.slice("slide-".length) : null;
    if (!storyId) return;
    const willLike = !reel.likedByMe;
    // Optimistic.
    set((st) => {
      const e = st.byUser[userId];
      if (!e) return {};
      return {
        byUser: { ...st.byUser, [userId]: { ...e, likedByMe: willLike } }
      };
    });
    if (willLike) {
      await supabase
        .from("story_likes")
        .upsert(
          { story_id: storyId, user_id: me.id },
          { onConflict: "story_id,user_id", ignoreDuplicates: true }
        );
    } else {
      await supabase
        .from("story_likes")
        .delete()
        .eq("story_id", storyId)
        .eq("user_id", me.id);
    }
  },

  replyToStory: async (storyAuthorId, slide, content) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const storyId = slide.id.startsWith("slide-") ? slide.id.slice("slide-".length) : slide.id;
    // Ensure a DM chat exists with the story author.
    const startDM = useChatStore.getState().startDM;
    const dm = await startDM(storyAuthorId);
    const chatId = dm.data?.id;
    if (!chatId) return;
    const sendAttachment = useChatStore.getState().sendAttachment;
    await sendAttachment(chatId, {
      kind: "text",
      content,
      storyReply: {
        storyId,
        src: slide.src,
        bg: slide.bg,
        text: slide.text
      }
    });
  },

  getStoryViewers: async (storyId) => {
    const rid = storyId.startsWith("slide-") ? storyId.slice("slide-".length) : storyId;
    const { data: views } = await supabase
      .from("story_views")
      .select("user_id")
      .eq("story_id", rid);
    if (!views?.length) return [];
    const ids = (views as ViewRow[]).map((v) => v.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, username, avatar")
      .in("id", ids);
    return (profiles || []).map((p: { id: string; name?: string; username?: string; avatar?: string }) => ({
      id: p.id,
      name: p.name || p.username,
      username: p.username,
      avatar: p.avatar
    }));
  },

  getStoryLikers: async (storyId) => {
    const rid = storyId.startsWith("slide-") ? storyId.slice("slide-".length) : storyId;
    const { data: likes } = await supabase
      .from("story_likes")
      .select("user_id")
      .eq("story_id", rid);
    if (!likes?.length) return [];
    const ids = (likes as LikeRow[]).map((v) => v.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, username, avatar")
      .in("id", ids);
    return (profiles || []).map((p: { id: string; name?: string; username?: string; avatar?: string }) => ({
      id: p.id,
      name: p.name || p.username,
      username: p.username,
      avatar: p.avatar
    }));
  },

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

  pruneExpired: () =>
    set((st) => {
      let changed = false;
      const next: Record<string, UserStories> = {};
      for (const [uid, reel] of Object.entries(st.byUser)) {
        const fresh = reel.slides.filter((s) => isFreshStory(s.postedAt));
        if (fresh.length === 0) {
          changed = true;
          continue;
        }
        if (fresh.length !== reel.slides.length) changed = true;
        next[uid] = fresh.length === reel.slides.length ? reel : { ...reel, slides: fresh };
      }
      return changed ? { byUser: next } : {};
    }),

  hasStory: (userId) => !!get().byUser[userId]?.slides.length,

  initializeRealtime: () => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    if (get().storyChannel) return;
    const channel = supabase
      .channel(`nova_stories_${me.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stories" },
        async (payload: RealtimePostgresChangesPayload<StoryRow>) => {
          const r = payload.new as StoryRow;
          // Skip our own inserts — addStory has already added them locally.
          if (r.author_id === me.id) return;
          const slide = rowToSlide(r);
          // Lazy-load the author's profile if we haven't seen them before so
          // their name + avatar render correctly in the rail/viewer.
          if (!get().profiles[r.author_id]) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("id, name, username, avatar")
              .eq("id", r.author_id)
              .single();
            if (prof) {
              set((st) => ({
                profiles: { ...st.profiles, [r.author_id]: prof as StoryProfile }
              }));
            }
          }
          set((st) => {
            const existing = st.byUser[r.author_id];
            const entry: UserStories = existing
              ? { ...existing, slides: [...existing.slides, slide], viewed: false }
              : { userId: r.author_id, slides: [slide], viewed: false };
            return { byUser: { ...st.byUser, [r.author_id]: entry } };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "stories" },
        (payload: RealtimePostgresChangesPayload<{ id?: string }>) => {
          const old = payload.old as { id?: string };
          if (!old?.id) return;
          const targetId = `slide-${old.id}`;
          set((st) => {
            const next: Record<string, UserStories> = {};
            for (const [uid, reel] of Object.entries(st.byUser)) {
              const filtered = reel.slides.filter((s) => s.id !== targetId);
              if (filtered.length === 0) continue;
              next[uid] = filtered.length === reel.slides.length ? reel : { ...reel, slides: filtered };
            }
            return { byUser: next };
          });
        }
      )
      .subscribe();
    set({ storyChannel: channel });
  },

  disconnectRealtime: () => {
    const ch = get().storyChannel;
    if (ch) supabase.removeChannel(ch);
    set({ storyChannel: null });
  }
}));
