"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/use-auth-store";
import type {
  Community,
  CommunityPoll,
  CommunityPost,
  CommunityPostKind,
  CommunitySong,
  ID
} from "@/types";

const supabase = createClient();

/** A row in Postgres for a community — snake_case keys mirror the table. */
interface CommunityRow {
  id: string;
  name: string;
  description: string | null;
  cover: string | null;
  category: string | null;
  host_id: string;
  interests: string[] | null;
  theme: string | null;
  verified: boolean;
  trending: boolean;
  created_at: string;
}

interface PostRow {
  id: string;
  community_id: string;
  author_id: string;
  kind: CommunityPostKind;
  content: string | null;
  media: { url: string; alt?: string; kind?: "image" | "video" }[] | null;
  song: CommunitySong | null;
  poll: { question: string; imageUrl?: string; options: { id: string; label: string }[]; multi?: boolean } | null;
  mentions: string[] | null;
  created_at: string;
}

interface ReactionRow {
  post_id: string;
  user_id: string;
  emoji: string;
}

interface PollVoteRow {
  post_id: string;
  user_id: string;
  option_id: string;
}

/** Window (seconds) for "online" — a member is online if last_seen_at
 *  is within this many seconds of now. Aligned with the heartbeat below. */
const ONLINE_WINDOW_S = 5 * 60;

/** Heartbeat interval — every minute we bump last_seen_at for the
 *  communities the user is currently joined to. */
const HEARTBEAT_MS = 60_000;

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

  /** Whether the initial fetch has completed (used by the Discover page
   *  to avoid a flash of empty state). */
  loaded: boolean;

  fetchCommunities: () => Promise<void>;
  fetchPosts: (communityId: string) => Promise<void>;

  createCommunity: (input: CreateCommunityInput) => Promise<Community | null>;
  joinCommunity: (communityId: string) => Promise<{ matched: number }>;
  leaveCommunity: (communityId: string) => Promise<void>;
  deleteCommunity: (communityId: string) => Promise<void>;
  isJoined: (communityId: string) => boolean;
  isHost: (communityId: string) => boolean;

  createPost: (communityId: string, post: CreatePostInput) => Promise<CommunityPost | null>;
  deletePost: (communityId: string, postId: string) => Promise<void>;
  reactToPost: (communityId: string, postId: string, emoji: string) => Promise<void>;
  votePoll: (communityId: string, postId: string, optionId: string) => Promise<void>;

  setCommunityTheme: (communityId: string, themeId: string | undefined) => Promise<void>;
  setUserInterests: (interests: string[]) => void;
}

/** Coerce a Postgres row into the Community shape the UI uses. Member /
 *  online counts come from the aggregated maps loaded alongside. */
function rowToCommunity(
  row: CommunityRow,
  members: number,
  online: number
): Community {
  return {
    id: row.id,
    name: row.name,
    cover: row.cover ?? "",
    members,
    online,
    category: row.category ?? "General",
    verified: row.verified,
    trending: row.trending,
    hostId: row.host_id,
    description: row.description ?? undefined,
    interests: row.interests ?? [],
    theme: row.theme ?? undefined
  };
}

/** Convert a Postgres post row + reactions + poll votes into the UI's
 *  CommunityPost shape (with reaction counts and byMe flags). */
function rowToPost(
  row: PostRow,
  myId: string | null,
  reactions: ReactionRow[],
  votes: PollVoteRow[]
): CommunityPost {
  // Group reactions by emoji.
  const byEmoji = new Map<string, { count: number; byMe: boolean }>();
  for (const r of reactions) {
    if (r.post_id !== row.id) continue;
    const cur = byEmoji.get(r.emoji) ?? { count: 0, byMe: false };
    cur.count += 1;
    if (myId && r.user_id === myId) cur.byMe = true;
    byEmoji.set(r.emoji, cur);
  }

  // Poll → fill in `votes` per option from the votes table.
  let poll: CommunityPoll | undefined;
  if (row.poll) {
    const votesByOption = new Map<string, number>();
    for (const v of votes) {
      if (v.post_id !== row.id) continue;
      votesByOption.set(v.option_id, (votesByOption.get(v.option_id) ?? 0) + 1);
    }
    poll = {
      question: row.poll.question,
      options: row.poll.options.map((o) => ({
        id: o.id,
        label: o.label,
        votes: votesByOption.get(o.id) ?? 0
      }))
    };
  }

  return {
    id: row.id,
    communityId: row.community_id,
    authorId: row.author_id,
    kind: row.kind,
    content: row.content ?? undefined,
    media: row.media ?? undefined,
    song: row.song ?? undefined,
    poll,
    mentions: row.mentions ?? undefined,
    reactions: Array.from(byEmoji.entries()).map(([emoji, v]) => ({
      emoji,
      count: v.count,
      byMe: v.byMe
    })),
    createdAt: row.created_at
  };
}

export const useCommunityStore = create<State>()((set, get) => ({
  communities: [],
  joinedIds: [],
  hostedIds: [],
  postsByCommunity: {},
  userInterests: ["design", "music", "ai", "late-night", "synthwave"],
  loaded: false,

  fetchCommunities: async () => {
    const meId = useAuthStore.getState().user?.id ?? null;

    // 1) All communities.
    const { data: rows } = await supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false });
    if (!rows) {
      set({ loaded: true });
      return;
    }

    // 2) All membership rows — used to derive members count, online count,
    //    and the current user's joined list in a single round-trip.
    const { data: memberRows } = await supabase
      .from("community_members")
      .select("community_id, user_id, last_seen_at");

    const memberCounts = new Map<string, number>();
    const onlineCounts = new Map<string, number>();
    const joinedIds: string[] = [];
    const nowMs = Date.now();
    for (const m of memberRows ?? []) {
      memberCounts.set(m.community_id, (memberCounts.get(m.community_id) ?? 0) + 1);
      const lastSeen = m.last_seen_at ? new Date(m.last_seen_at).getTime() : 0;
      if (nowMs - lastSeen <= ONLINE_WINDOW_S * 1000) {
        onlineCounts.set(m.community_id, (onlineCounts.get(m.community_id) ?? 0) + 1);
      }
      if (meId && m.user_id === meId) joinedIds.push(m.community_id);
    }

    const communities = (rows as CommunityRow[]).map((r) =>
      rowToCommunity(
        r,
        memberCounts.get(r.id) ?? 0,
        onlineCounts.get(r.id) ?? 0
      )
    );
    const hostedIds = meId
      ? communities.filter((c) => c.hostId === meId).map((c) => c.id)
      : [];

    set({ communities, joinedIds, hostedIds, loaded: true });
  },

  fetchPosts: async (communityId) => {
    const meId = useAuthStore.getState().user?.id ?? null;

    const { data: postRows } = await supabase
      .from("community_posts")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });
    if (!postRows) return;

    const postIds = (postRows as PostRow[]).map((p) => p.id);
    if (postIds.length === 0) {
      set((s) => ({
        postsByCommunity: { ...s.postsByCommunity, [communityId]: [] }
      }));
      return;
    }

    const [{ data: reactionRows }, { data: voteRows }] = await Promise.all([
      supabase.from("community_reactions").select("*").in("post_id", postIds),
      supabase.from("community_poll_votes").select("*").in("post_id", postIds)
    ]);

    const posts = (postRows as PostRow[]).map((p) =>
      rowToPost(p, meId, (reactionRows as ReactionRow[]) ?? [], (voteRows as PollVoteRow[]) ?? [])
    );

    set((s) => ({
      postsByCommunity: { ...s.postsByCommunity, [communityId]: posts }
    }));
  },

  createCommunity: async (input) => {
    const meId = useAuthStore.getState().user?.id;
    if (!meId) return null;

    const insertRow = {
      name: input.name.trim() || "Untitled community",
      description: input.description || null,
      cover: input.cover || null,
      category: input.category || "General",
      host_id: meId,
      interests: input.interests,
      theme: input.theme ?? null
    };
    const { data, error } = await supabase
      .from("communities")
      .insert(insertRow)
      .select()
      .single<CommunityRow>();
    if (error || !data) {
      console.error("[community] create failed", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        rawError: error,
        insertRow
      });
      return null;
    }

    // Auto-join the host so the membership count starts at 1.
    await supabase.from("community_members").insert({
      community_id: data.id,
      user_id: meId
    });

    const community = rowToCommunity(data, 1, 1);

    set((s) => ({
      communities: [community, ...s.communities],
      joinedIds: [...s.joinedIds, community.id],
      hostedIds: [...s.hostedIds, community.id],
      postsByCommunity: { ...s.postsByCommunity, [community.id]: [] }
    }));
    return community;
  },

  joinCommunity: async (communityId) => {
    const meId = useAuthStore.getState().user?.id;
    if (!meId) return { matched: 0 };

    // Already joined — no-op.
    if (get().joinedIds.includes(communityId)) return { matched: 0 };

    const { error } = await supabase
      .from("community_members")
      .insert({ community_id: communityId, user_id: meId });
    if (error) {
      console.error("[community] join failed", error);
      return { matched: 0 };
    }

    // Compute the "X people match your interests" popup count locally
    // from the user's interests vs. the community's interest tags.
    const state = get();
    const community = state.communities.find((c) => c.id === communityId);
    const userInterests = new Set(state.userInterests.map((s) => s.toLowerCase()));
    const communityInterests = (community?.interests ?? []).map((s) => s.toLowerCase());
    const overlap = communityInterests.some((i) => userInterests.has(i));
    const matched =
      overlap && community
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

  leaveCommunity: async (communityId) => {
    const meId = useAuthStore.getState().user?.id;
    if (!meId) return;

    const { error } = await supabase
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", meId);
    if (error) {
      console.error("[community] leave failed", error);
      return;
    }

    set((s) => ({
      joinedIds: s.joinedIds.filter((id) => id !== communityId),
      communities: s.communities.map((c) =>
        c.id === communityId
          ? { ...c, members: Math.max(0, c.members - 1), online: Math.max(0, c.online - 1) }
          : c
      )
    }));
  },

  deleteCommunity: async (communityId) => {
    if (!get().hostedIds.includes(communityId)) return;
    const { error } = await supabase
      .from("communities")
      .delete()
      .eq("id", communityId);
    if (error) {
      console.error("[community] delete failed", error);
      return;
    }
    set((s) => {
      const { [communityId]: _removed, ...restPosts } = s.postsByCommunity;
      return {
        communities: s.communities.filter((c) => c.id !== communityId),
        joinedIds: s.joinedIds.filter((id) => id !== communityId),
        hostedIds: s.hostedIds.filter((id) => id !== communityId),
        postsByCommunity: restPosts
      };
    });
  },

  isJoined: (communityId) => get().joinedIds.includes(communityId),
  isHost: (communityId) => get().hostedIds.includes(communityId),

  createPost: async (communityId, post) => {
    const meId = useAuthStore.getState().user?.id;
    if (!meId) return null;
    if (!get().isHost(communityId)) return null;

    // mentions is uuid[] in Postgres — drop anything that isn't a real
    // UUID (e.g. leftover mock-data ids like "u1") so the insert doesn't
    // explode with `22P02 invalid input syntax for type uuid`.
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanMentions =
      post.mentions?.filter((m) => typeof m === "string" && UUID_RE.test(m)) ??
      [];

    const insertRow = {
      community_id: communityId,
      author_id: meId,
      kind: post.kind,
      content: post.content ?? null,
      media: post.media ?? null,
      song: post.song ?? null,
      // Strip the per-option votes count when persisting — votes are
      // tracked in community_poll_votes and computed on read.
      poll: post.poll
        ? {
            question: post.poll.question,
            options: post.poll.options.map((o) => ({ id: o.id, label: o.label }))
          }
        : null,
      mentions: cleanMentions.length > 0 ? cleanMentions : null
    };
    const { data, error } = await supabase
      .from("community_posts")
      .insert(insertRow)
      .select()
      .single<PostRow>();
    if (error || !data) {
      // Next.js dev overlay flattens objects with undefined values to `{}`,
      // so log a JSON-stringified version + the raw error as a separate
      // argument so it's expandable in the real browser DevTools console.
      const errAny = error as unknown as Record<string, unknown> | null;
      console.error(
        "[community] createPost failed:",
        JSON.stringify(
          errAny,
          Object.getOwnPropertyNames(errAny ?? {})
        ) || "(no error object — likely RLS silently filtered the returned row)",
        "\nraw error object:",
        error,
        "\ninsertRow:",
        insertRow,
        "\nmeId:",
        meId,
        "\nisHost result:",
        get().isHost(communityId)
      );
      return null;
    }

    const newPost: CommunityPost = rowToPost(data, meId, [], []);
    set((s) => ({
      postsByCommunity: {
        ...s.postsByCommunity,
        [communityId]: [newPost, ...(s.postsByCommunity[communityId] ?? [])]
      }
    }));
    return newPost;
  },

  deletePost: async (communityId, postId) => {
    const meId = useAuthStore.getState().user?.id;
    if (!meId) return;
    if (!get().isHost(communityId)) return;

    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);
    if (error) {
      console.error("[community] deletePost failed", error);
      return;
    }
    set((s) => ({
      postsByCommunity: {
        ...s.postsByCommunity,
        [communityId]: (s.postsByCommunity[communityId] ?? []).filter(
          (p) => p.id !== postId
        )
      }
    }));
  },

  reactToPost: async (communityId, postId, emoji) => {
    const meId = useAuthStore.getState().user?.id;
    if (!meId) return;

    // Optimistic toggle — find current state to know whether to insert
    // or delete.
    const post = (get().postsByCommunity[communityId] ?? []).find(
      (p) => p.id === postId
    );
    const existing = post?.reactions?.find((r) => r.emoji === emoji);
    const willRemove = !!existing?.byMe;

    set((s) => ({
      postsByCommunity: {
        ...s.postsByCommunity,
        [communityId]: (s.postsByCommunity[communityId] ?? []).map((p) => {
          if (p.id !== postId) return p;
          const reactions = p.reactions ?? [];
          const e = reactions.find((r) => r.emoji === emoji);
          let next;
          if (e) {
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
    }));

    if (willRemove) {
      await supabase
        .from("community_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", meId)
        .eq("emoji", emoji);
    } else {
      await supabase
        .from("community_reactions")
        .insert({ post_id: postId, user_id: meId, emoji });
    }
  },

  votePoll: async (communityId, postId, optionId) => {
    const meId = useAuthStore.getState().user?.id;
    if (!meId) return;

    // Optimistic — bump the chosen option's count locally.
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
    }));

    // UPSERT — re-voting switches the option (PK is post_id + user_id).
    await supabase.from("community_poll_votes").upsert(
      { post_id: postId, user_id: meId, option_id: optionId },
      { onConflict: "post_id,user_id" }
    );
  },

  setCommunityTheme: async (communityId, themeId) => {
    set((s) => ({
      communities: s.communities.map((c) =>
        c.id === communityId ? { ...c, theme: themeId } : c
      )
    }));
    await supabase
      .from("communities")
      .update({ theme: themeId ?? null })
      .eq("id", communityId);
  },

  setUserInterests: (interests) => set({ userInterests: interests })
}));

/** Stable empty list to avoid the Zustand selector-loop pitfall. */
export const EMPTY_POSTS = Object.freeze([]) as readonly CommunityPost[];

/** Heartbeat — every minute, while the user is signed in, bump
 *  last_seen_at on every community they've joined. The query is keyed
 *  on (community_id, user_id) so it's a single conditional UPDATE — no
 *  rows touched if they're not a member.
 *
 *  Runs in the client only — guarded for SSR. */
if (typeof window !== "undefined") {
  const tick = async () => {
    const meId = useAuthStore.getState().user?.id;
    const joined = useCommunityStore.getState().joinedIds;
    if (!meId || joined.length === 0) return;
    await supabase
      .from("community_members")
      .update({ last_seen_at: new Date().toISOString() })
      .in("community_id", joined)
      .eq("user_id", meId);
  };
  // Fire one immediately on load (in case the user reopens a tab and
  // hasn't yet ticked); then once per minute.
  window.setTimeout(tick, 1500);
  window.setInterval(tick, HEARTBEAT_MS);
}
