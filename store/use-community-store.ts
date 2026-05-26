"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { communities as seedCommunities, communityPosts as seedPosts } from "@/lib/mock-data";
import type {
  Community,
  CommunityPoll,
  CommunityPost,
  CommunityPostKind,
  CommunitySong,
  ID
} from "@/types";

export interface CreateCommunityInput {
  name: string;
  description: string;
  category: string;
  cover: string;
  interests: string[];
  theme?: string;
}

export interface CreatePostInput {
  kind: CommunityPostKind;
  content?: string;
  media?: { url: string; alt?: string; kind?: "image" | "video" }[];
  song?: CommunitySong;
  poll?: CommunityPoll;
  mentions?: ID[];
}

interface State {
  communities: Community[];
  joinedIds: string[];
  hostedIds: string[];
  postsByCommunity: Record<string, CommunityPost[]>;
  /** User-picked interests used to compute the "X match your interest" popup. */
  userInterests: string[];

  createCommunity: (input: CreateCommunityInput) => Community;
  /** Join a community. Returns how many *other* joined members share at least
   *  one interest with the user — used by the popup animation. */
  joinCommunity: (communityId: string) => { matched: number };
  leaveCommunity: (communityId: string) => void;
  deleteCommunity: (communityId: string) => void;
  isJoined: (communityId: string) => boolean;
  isHost: (communityId: string) => boolean;

  createPost: (communityId: string, post: CreatePostInput) => CommunityPost | null;
  deletePost: (communityId: string, postId: string) => void;
  reactToPost: (communityId: string, postId: string, emoji: string) => void;
  votePoll: (communityId: string, postId: string, optionId: string) => void;

  setCommunityTheme: (communityId: string, themeId: string | undefined) => void;
  setUserInterests: (interests: string[]) => void;
}

export const useCommunityStore = create<State>()(
  persist(
    (set, get) => ({
      communities: seedCommunities,
      joinedIds: [],
      hostedIds: [],
      postsByCommunity: seedPosts,
      userInterests: ["design", "music", "ai", "late-night", "synthwave"],

      createCommunity: (input) => {
        const id = `co-${Date.now()}`;
        const community: Community = {
          id,
          name: input.name.trim() || "Untitled community",
          cover: input.cover,
          members: 1,
          online: 1,
          category: input.category || "General",
          interests: input.interests,
          description: input.description,
          hostId: "me",
          theme: input.theme,
          verified: false,
          trending: false
        };
        set((s) => ({
          communities: [community, ...s.communities],
          joinedIds: [...s.joinedIds, id],
          hostedIds: [...s.hostedIds, id],
          postsByCommunity: { ...s.postsByCommunity, [id]: [] }
        }));
        return community;
      },

      joinCommunity: (communityId) => {
        const state = get();
        if (state.joinedIds.includes(communityId)) return { matched: 0 };
        const community = state.communities.find((c) => c.id === communityId);
        const userInterests = new Set(state.userInterests.map((s) => s.toLowerCase()));
        const communityInterests = (community?.interests ?? []).map((s) => s.toLowerCase());
        const overlap = communityInterests.some((i) => userInterests.has(i));
        // Deterministic "matched" count: scale with community size and overlap.
        const matched = overlap && community
          ? Math.max(2, Math.min(community.members, Math.floor(community.members * 0.04)))
          : 0;
        set((s) => ({
          joinedIds: [...s.joinedIds, communityId],
          communities: s.communities.map((c) =>
            c.id === communityId
              ? { ...c, members: c.members + 1, online: c.online + 1 }
              : c
          )
        }));
        return { matched };
      },

      leaveCommunity: (communityId) =>
        set((s) => ({
          joinedIds: s.joinedIds.filter((id) => id !== communityId),
          communities: s.communities.map((c) =>
            c.id === communityId
              ? { ...c, members: Math.max(0, c.members - 1), online: Math.max(0, c.online - 1) }
              : c
          )
        })),

      deleteCommunity: (communityId) =>
        set((s) => {
          if (!s.hostedIds.includes(communityId)) return s;
          const { [communityId]: _removed, ...restPosts } = s.postsByCommunity;
          return {
            communities: s.communities.filter((c) => c.id !== communityId),
            joinedIds: s.joinedIds.filter((id) => id !== communityId),
            hostedIds: s.hostedIds.filter((id) => id !== communityId),
            postsByCommunity: restPosts
          };
        }),

      isJoined: (communityId) => get().joinedIds.includes(communityId),
      isHost: (communityId) => {
        const c = get().communities.find((x) => x.id === communityId);
        return c?.hostId === "me" || get().hostedIds.includes(communityId);
      },

      createPost: (communityId, post) => {
        if (!get().isHost(communityId)) return null;
        const newPost: CommunityPost = {
          id: `cp-${Date.now()}`,
          communityId,
          authorId: "me",
          ...post,
          reactions: [],
          createdAt: new Date().toISOString()
        };
        set((s) => ({
          postsByCommunity: {
            ...s.postsByCommunity,
            [communityId]: [newPost, ...(s.postsByCommunity[communityId] ?? [])]
          }
        }));
        return newPost;
      },

      deletePost: (communityId, postId) => {
        if (!get().isHost(communityId)) return;
        set((s) => ({
          postsByCommunity: {
            ...s.postsByCommunity,
            [communityId]: (s.postsByCommunity[communityId] ?? []).filter(
              (p) => p.id !== postId
            )
          }
        }));
      },

      reactToPost: (communityId, postId, emoji) =>
        set((s) => ({
          postsByCommunity: {
            ...s.postsByCommunity,
            [communityId]: (s.postsByCommunity[communityId] ?? []).map((p) => {
              if (p.id !== postId) return p;
              const reactions = p.reactions ?? [];
              const existing = reactions.find((r) => r.emoji === emoji);
              let next;
              if (existing) {
                next = reactions
                  .map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.count + (r.byMe ? -1 : 1), byMe: !r.byMe }
                      : r
                  )
                  .filter((r) => r.count > 0);
              } else {
                next = [...reactions, { emoji, count: 1, byMe: true }];
              }
              return { ...p, reactions: next };
            })
          }
        })),

      votePoll: (communityId, postId, optionId) =>
        set((s) => ({
          postsByCommunity: {
            ...s.postsByCommunity,
            [communityId]: (s.postsByCommunity[communityId] ?? []).map((p) => {
              if (p.id !== postId || !p.poll) return p;
              return {
                ...p,
                poll: {
                  ...p.poll,
                  options: p.poll.options.map((o) =>
                    o.id === optionId ? { ...o, votes: o.votes + 1 } : o
                  )
                }
              };
            })
          }
        })),

      setCommunityTheme: (communityId, themeId) =>
        set((s) => ({
          communities: s.communities.map((c) =>
            c.id === communityId ? { ...c, theme: themeId } : c
          )
        })),

      setUserInterests: (interests) => set({ userInterests: interests })
    }),
    {
      name: "nova-communities",
      partialize: (s) => ({
        communities: s.communities,
        joinedIds: s.joinedIds,
        hostedIds: s.hostedIds,
        postsByCommunity: s.postsByCommunity,
        userInterests: s.userInterests
      })
    }
  )
);

/** Stable empty list to avoid the Zustand selector-loop pitfall. */
export const EMPTY_POSTS = Object.freeze([]) as readonly CommunityPost[];
