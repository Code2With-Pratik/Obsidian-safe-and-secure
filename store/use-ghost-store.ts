"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ghostRooms as seedRooms } from "@/lib/mock-data";
import type { GhostRoom } from "@/types";

export type GhostChannelType = "text" | "voice";

export interface GhostChannel {
  id: string;
  roomId: string;
  type: GhostChannelType;
  category: string; // e.g. "lounge", "voice"
  name: string;
  topic?: string;
}

export interface GhostIdentity {
  id: string;
  /** Internal handle — never shown to other users; the UI displays "Ghost" / "Anonymous". */
  name: string;
  hue: number;
  avatarSeed: string;
}

/** Per-participant call state (mic/camera + host permissions). */
export interface GhostCallState {
  /** ghostId -> participant runtime state */
  participants: Record<
    string,
    {
      muted: boolean;
      cameraOn: boolean;
      canSpeak: boolean;
      canCamera: boolean;
      raisedHand: boolean;
      speaking: boolean;
    }
  >;
  /** ghostId of the pinned (large) tile, or null. */
  pinnedId: string | null;
}

export interface GhostMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorHue: number;
  authorSeed: string;
  content: string;
  createdAt: string;
  reactions?: { emoji: string; count: number; byMe: boolean }[];
  /** True for chat-system events ("Whisper#42 joined the room"). */
  system?: boolean;
}

export interface CreateRoomInput {
  name: string;
  topic: string;
  pin: string;
  locked: boolean;
  capacity: number;
  autoCloseHours: number;
}

interface State {
  rooms: GhostRoom[];
  joinedIds: string[];
  createdIds: string[];

  /** roomId -> channels */
  channelsByRoom: Record<string, GhostChannel[]>;
  /** channelId -> messages */
  messagesByChannel: Record<string, GhostMessage[]>;
  /** roomId -> the *user's* ghost identity in that room */
  myIdentityByRoom: Record<string, GhostIdentity>;
  /** roomId -> all ghost identities currently in the room (incl. mine) */
  membersByRoom: Record<string, GhostIdentity[]>;
  /** roomId -> the channel id currently focused in the UI */
  activeChannelByRoom: Record<string, string>;
  /** channelId -> ghost ids currently "in voice" */
  voiceParticipantsByChannel: Record<string, string[]>;
  /** roomId -> the room's host (the user that created it; first member otherwise). */
  hostByRoom: Record<string, string>;
  /** roomId -> live call state (mic/camera/permissions/pin). */
  callByRoom: Record<string, GhostCallState>;
  /** roomId -> simple "stream chat" messages (YouTube-style live chat). */
  streamChatByRoom: Record<
    string,
    {
      id: string;
      authorId: string;
      authorHue: number;
      content: string;
      createdAt: string;
    }[]
  >;

  createRoom: (input: CreateRoomInput) => GhostRoom;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  findByPin: (pin: string) => GhostRoom | undefined;
  isJoined: (roomId: string) => boolean;

  setActiveChannel: (roomId: string, channelId: string) => void;
  sendGhostMessage: (channelId: string, content: string) => void;
  toggleGhostReaction: (channelId: string, messageId: string, emoji: string) => void;

  joinVoice: (channelId: string) => void;
  leaveVoice: (channelId: string) => void;

  /* ---- Live call actions ---- */
  setCallParticipantState: (
    roomId: string,
    ghostId: string,
    patch: Partial<GhostCallState["participants"][string]>
  ) => void;
  setPinnedParticipant: (roomId: string, ghostId: string | null) => void;
  kickFromRoom: (roomId: string, ghostId: string) => void;
  sendStreamChat: (roomId: string, content: string) => void;
}

const AURAS = [
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#22D3EE,#3B82F6)",
  "linear-gradient(135deg,#A3E635,#22D3EE)",
  "linear-gradient(135deg,#FBBF24,#EC4899)",
  "linear-gradient(135deg,#A78BFA,#60A5FA)",
  "linear-gradient(135deg,#FB7185,#F472B6)",
  "linear-gradient(135deg,#10B981,#22D3EE)"
];

function pickAura(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AURAS[hash % AURAS.length];
}

const GHOST_NAMES = [
  "Whisper",
  "Echo",
  "Shadow",
  "Vapor",
  "Drift",
  "Phantom",
  "Mirage",
  "Wisp",
  "Hush",
  "Specter",
  "Ember",
  "Obsidian",
  "Cipher",
  "Halo",
  "Pulse",
  "Lunar",
  "Eclipse",
  "Aether",
  "Onyx",
  "Quartz"
];

function randomGhostIdentity(): GhostIdentity {
  const name = GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];
  const tag = String(Math.floor(Math.random() * 9000) + 1000);
  const hue = Math.floor(Math.random() * 360);
  return {
    id: `gi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${name}#${tag}`,
    hue,
    avatarSeed: `${name}-${tag}`
  };
}

function defaultChannelsFor(roomId: string, topic: string): GhostChannel[] {
  return [
    {
      id: `${roomId}-c-general`,
      roomId,
      type: "text",
      category: "lounge",
      name: "general",
      topic: topic || "Drop in. Be no one."
    },
    {
      id: `${roomId}-c-confessions`,
      roomId,
      type: "text",
      category: "lounge",
      name: "confessions",
      topic: "Anything you'd never say out loud."
    },
    {
      id: `${roomId}-c-after-hours`,
      roomId,
      type: "text",
      category: "lounge",
      name: "after-hours",
      topic: "Late-night thoughts welcome."
    },
    {
      id: `${roomId}-v-lounge`,
      roomId,
      type: "voice",
      category: "voice",
      name: "Voice Lounge"
    },
    {
      id: `${roomId}-v-stage`,
      roomId,
      type: "voice",
      category: "voice",
      name: "Late-night Stage"
    }
  ];
}

/** Generate a deterministic, seed-based message timestamp `m` minutes ago. */
function minutesAgo(m: number) {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

function seedConversationFor(channel: GhostChannel, members: GhostIdentity[]): GhostMessage[] {
  if (channel.type !== "text") return [];
  if (members.length === 0) return [];
  const lines: string[] = channel.name === "general"
    ? [
        "anyone else lurking?",
        "i'm here. just need silence with strangers tonight 🌒",
        "drop a song if you want company.",
        "playing fkj — ylang ylang on loop",
        "this is exactly the vibe i needed",
        "we should keep this room alive longer"
      ]
    : channel.name === "confessions"
      ? [
          "i quit my job last week and haven't told anyone yet.",
          "you're braver than 95% of people. for what it's worth.",
          "i pretend to be okay until i'm actually okay sometimes",
          "this room has helped more than my therapist tbh"
        ]
      : [
          "3am is the only time i feel awake",
          "tea or coffee at this hour?",
          "matcha. always.",
          "send me your saddest playlist 🥹"
        ];
  return lines.map((line, i) => {
    const author = members[(i + channel.name.length) % members.length];
    return {
      id: `${channel.id}-m${i}`,
      channelId: channel.id,
      authorId: author.id,
      authorName: author.name,
      authorHue: author.hue,
      authorSeed: author.avatarSeed,
      content: line,
      createdAt: minutesAgo((lines.length - i) * 7)
    };
  });
}

function seedMembersForRoom(roomId: string, count: number): GhostIdentity[] {
  // Deterministic seed so the SSR-rendered identities match the client.
  const out: GhostIdentity[] = [];
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) hash = (hash * 31 + roomId.charCodeAt(i)) >>> 0;
  for (let i = 0; i < count; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    const name = GHOST_NAMES[hash % GHOST_NAMES.length];
    hash = (hash * 1103515245 + 12345) >>> 0;
    const tag = String(1000 + (hash % 9000));
    hash = (hash * 1103515245 + 12345) >>> 0;
    const hue = hash % 360;
    out.push({
      id: `${roomId}-seed-${i}`,
      name: `${name}#${tag}`,
      hue,
      avatarSeed: `${name}-${tag}-${i}`
    });
  }
  return out;
}

function bootstrapSeedRooms(): {
  channels: Record<string, GhostChannel[]>;
  members: Record<string, GhostIdentity[]>;
  messages: Record<string, GhostMessage[]>;
  active: Record<string, string>;
  hosts: Record<string, string>;
  calls: Record<string, GhostCallState>;
} {
  const channels: Record<string, GhostChannel[]> = {};
  const members: Record<string, GhostIdentity[]> = {};
  const messages: Record<string, GhostMessage[]> = {};
  const active: Record<string, string> = {};
  const hosts: Record<string, string> = {};
  const calls: Record<string, GhostCallState> = {};
  for (const room of seedRooms) {
    const ch = defaultChannelsFor(room.id, room.topic);
    channels[room.id] = ch;
    const m = seedMembersForRoom(room.id, Math.min(room.members, 8));
    members[room.id] = m;
    active[room.id] = ch[0].id;
    for (const c of ch) {
      messages[c.id] = seedConversationFor(c, m);
    }
    // First seeded member is the host.
    hosts[room.id] = m[0]?.id ?? "";
    // Deterministic camera/mic state per ghost so SSR matches CSR.
    const participants: GhostCallState["participants"] = {};
    let hash = 0;
    for (let i = 0; i < room.id.length; i++) hash = (hash * 31 + room.id.charCodeAt(i)) >>> 0;
    m.forEach((g, idx) => {
      hash = (hash * 1103515245 + 12345) >>> 0;
      const camOn = (hash >>> idx) % 5 < 2; // ~40% have camera on
      hash = (hash * 1103515245 + 12345) >>> 0;
      const muted = (hash >>> idx) % 4 < 2; // ~50% muted
      participants[g.id] = {
        muted,
        cameraOn: camOn,
        canSpeak: true,
        canCamera: true,
        raisedHand: false,
        speaking: !muted && (hash >>> (idx + 3)) % 5 === 0
      };
    });
    // The host is pinned by default.
    calls[room.id] = {
      participants,
      pinnedId: m[0]?.id ?? null
    };
  }
  return { channels, members, messages, active, hosts, calls };
}

const seeded = bootstrapSeedRooms();

export const useGhostStore = create<State>()(
  persist(
    (set, get) => ({
      rooms: seedRooms,
      joinedIds: [],
      createdIds: [],
      channelsByRoom: seeded.channels,
      messagesByChannel: seeded.messages,
      myIdentityByRoom: {},
      membersByRoom: seeded.members,
      activeChannelByRoom: seeded.active,
      voiceParticipantsByChannel: {},
      hostByRoom: seeded.hosts,
      callByRoom: seeded.calls,
      streamChatByRoom: {},

      createRoom: (input) => {
        const id = `gr-${Date.now()}`;
        const expiresAt =
          input.autoCloseHours > 0
            ? new Date(Date.now() + input.autoCloseHours * 60 * 60 * 1000).toISOString()
            : undefined;
        const room: GhostRoom = {
          id,
          name: input.name.trim() || "Untitled ghost room",
          topic: input.topic.trim() || "Drop in. Be no one.",
          pin: input.pin,
          members: 1,
          capacity: input.capacity,
          isLocked: input.locked,
          aura: pickAura(input.name + id),
          expiresAt
        };
        const channels = defaultChannelsFor(id, room.topic);
        const myIdentity = randomGhostIdentity();
        set((s) => ({
          rooms: [room, ...s.rooms],
          joinedIds: [...s.joinedIds, id],
          createdIds: [...s.createdIds, id],
          channelsByRoom: { ...s.channelsByRoom, [id]: channels },
          messagesByChannel: {
            ...s.messagesByChannel,
            ...Object.fromEntries(channels.map((c) => [c.id, []]))
          },
          myIdentityByRoom: { ...s.myIdentityByRoom, [id]: myIdentity },
          membersByRoom: { ...s.membersByRoom, [id]: [myIdentity] },
          activeChannelByRoom: { ...s.activeChannelByRoom, [id]: channels[0].id },
          hostByRoom: { ...s.hostByRoom, [id]: myIdentity.id },
          callByRoom: {
            ...s.callByRoom,
            [id]: {
              participants: {
                [myIdentity.id]: {
                  muted: false,
                  cameraOn: true,
                  canSpeak: true,
                  canCamera: true,
                  raisedHand: false,
                  speaking: false
                }
              },
              pinnedId: myIdentity.id
            }
          }
        }));
        return room;
      },

      joinRoom: (roomId) =>
        set((s) => {
          if (s.joinedIds.includes(roomId)) return s;
          // Ensure channels + identity exist for this room (mock rooms already have channels seeded).
          const channels = s.channelsByRoom[roomId] ?? defaultChannelsFor(roomId, "");
          const myIdentity = s.myIdentityByRoom[roomId] ?? randomGhostIdentity();
          const existingMembers = s.membersByRoom[roomId] ?? [];
          const callState = s.callByRoom[roomId] ?? { participants: {}, pinnedId: null };
          return {
            joinedIds: [...s.joinedIds, roomId],
            rooms: s.rooms.map((r) =>
              r.id === roomId ? { ...r, members: Math.min(r.capacity, r.members + 1) } : r
            ),
            channelsByRoom: { ...s.channelsByRoom, [roomId]: channels },
            myIdentityByRoom: { ...s.myIdentityByRoom, [roomId]: myIdentity },
            membersByRoom: {
              ...s.membersByRoom,
              [roomId]: existingMembers.some((m) => m.id === myIdentity.id)
                ? existingMembers
                : [...existingMembers, myIdentity]
            },
            activeChannelByRoom: {
              ...s.activeChannelByRoom,
              [roomId]: s.activeChannelByRoom[roomId] ?? channels[0]?.id
            },
            callByRoom: {
              ...s.callByRoom,
              [roomId]: {
                ...callState,
                participants: {
                  ...callState.participants,
                  [myIdentity.id]: callState.participants[myIdentity.id] ?? {
                    muted: false,
                    cameraOn: false,
                    canSpeak: true,
                    canCamera: true,
                    raisedHand: false,
                    speaking: false
                  }
                },
                pinnedId: callState.pinnedId ?? myIdentity.id
              }
            }
          };
        }),

      leaveRoom: (roomId) =>
        set((s) => {
          const me = s.myIdentityByRoom[roomId];
          return {
            joinedIds: s.joinedIds.filter((id) => id !== roomId),
            rooms: s.rooms.map((r) =>
              r.id === roomId ? { ...r, members: Math.max(0, r.members - 1) } : r
            ),
            membersByRoom: {
              ...s.membersByRoom,
              [roomId]: (s.membersByRoom[roomId] ?? []).filter((m) => m.id !== me?.id)
            }
          };
        }),

      findByPin: (pin) => {
        const trimmed = pin.trim();
        if (!trimmed) return undefined;
        return get().rooms.find((r) => r.pin === trimmed);
      },

      isJoined: (roomId) => get().joinedIds.includes(roomId),

      setActiveChannel: (roomId, channelId) =>
        set((s) => ({
          activeChannelByRoom: { ...s.activeChannelByRoom, [roomId]: channelId }
        })),

      sendGhostMessage: (channelId, content) => {
        const trimmed = content.trim();
        if (!trimmed) return;
        const state = get();
        // Find which room this channel belongs to so we can grab the user's identity.
        let roomId: string | undefined;
        for (const [rid, channels] of Object.entries(state.channelsByRoom)) {
          if (channels.some((c) => c.id === channelId)) {
            roomId = rid;
            break;
          }
        }
        if (!roomId) return;
        const me = state.myIdentityByRoom[roomId];
        if (!me) return;
        const msg: GhostMessage = {
          id: `gm-${Date.now()}`,
          channelId,
          authorId: me.id,
          authorName: me.name,
          authorHue: me.hue,
          authorSeed: me.avatarSeed,
          content: trimmed,
          createdAt: new Date().toISOString()
        };
        set((s) => ({
          messagesByChannel: {
            ...s.messagesByChannel,
            [channelId]: [...(s.messagesByChannel[channelId] ?? []), msg]
          }
        }));
      },

      toggleGhostReaction: (channelId, messageId, emoji) =>
        set((s) => ({
          messagesByChannel: {
            ...s.messagesByChannel,
            [channelId]: (s.messagesByChannel[channelId] ?? []).map((m) => {
              if (m.id !== messageId) return m;
              const reactions = m.reactions ?? [];
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
              return { ...m, reactions: next };
            })
          }
        })),

      joinVoice: (channelId) =>
        set((s) => {
          // Find room for the channel to look up my identity.
          let roomId: string | undefined;
          for (const [rid, channels] of Object.entries(s.channelsByRoom)) {
            if (channels.some((c) => c.id === channelId)) {
              roomId = rid;
              break;
            }
          }
          if (!roomId) return s;
          const meId = s.myIdentityByRoom[roomId]?.id;
          if (!meId) return s;
          // Drop me out of any other voice channel first.
          const cleaned: Record<string, string[]> = {};
          for (const [cid, ids] of Object.entries(s.voiceParticipantsByChannel)) {
            cleaned[cid] = ids.filter((id) => id !== meId);
          }
          cleaned[channelId] = [...(cleaned[channelId] ?? []), meId];
          return { voiceParticipantsByChannel: cleaned };
        }),

      leaveVoice: (channelId) =>
        set((s) => {
          let roomId: string | undefined;
          for (const [rid, channels] of Object.entries(s.channelsByRoom)) {
            if (channels.some((c) => c.id === channelId)) {
              roomId = rid;
              break;
            }
          }
          if (!roomId) return s;
          const meId = s.myIdentityByRoom[roomId]?.id;
          return {
            voiceParticipantsByChannel: {
              ...s.voiceParticipantsByChannel,
              [channelId]: (s.voiceParticipantsByChannel[channelId] ?? []).filter(
                (id) => id !== meId
              )
            }
          };
        }),

      setCallParticipantState: (roomId, ghostId, patch) =>
        set((s) => {
          const call = s.callByRoom[roomId];
          if (!call) return s;
          const prev = call.participants[ghostId];
          if (!prev) return s;
          return {
            callByRoom: {
              ...s.callByRoom,
              [roomId]: {
                ...call,
                participants: {
                  ...call.participants,
                  [ghostId]: { ...prev, ...patch }
                }
              }
            }
          };
        }),

      setPinnedParticipant: (roomId, ghostId) =>
        set((s) => {
          const call = s.callByRoom[roomId];
          if (!call) return s;
          return {
            callByRoom: {
              ...s.callByRoom,
              [roomId]: { ...call, pinnedId: ghostId }
            }
          };
        }),

      kickFromRoom: (roomId, ghostId) =>
        set((s) => {
          const call = s.callByRoom[roomId];
          const { [ghostId]: _removed, ...participants } = call?.participants ?? {};
          return {
            membersByRoom: {
              ...s.membersByRoom,
              [roomId]: (s.membersByRoom[roomId] ?? []).filter((m) => m.id !== ghostId)
            },
            callByRoom: call
              ? {
                  ...s.callByRoom,
                  [roomId]: {
                    ...call,
                    participants,
                    pinnedId: call.pinnedId === ghostId ? null : call.pinnedId
                  }
                }
              : s.callByRoom
          };
        }),

      sendStreamChat: (roomId, content) => {
        const trimmed = content.trim();
        if (!trimmed) return;
        const state = get();
        const me = state.myIdentityByRoom[roomId];
        if (!me) return;
        set((s) => ({
          streamChatByRoom: {
            ...s.streamChatByRoom,
            [roomId]: [
              ...(s.streamChatByRoom[roomId] ?? []),
              {
                id: `gsc-${Date.now()}`,
                authorId: me.id,
                authorHue: me.hue,
                content: trimmed,
                createdAt: new Date().toISOString()
              }
            ]
          }
        }));
      }
    }),
    {
      name: "nova-ghost-rooms",
      partialize: (s) => ({
        rooms: s.rooms,
        joinedIds: s.joinedIds,
        createdIds: s.createdIds,
        channelsByRoom: s.channelsByRoom,
        messagesByChannel: s.messagesByChannel,
        myIdentityByRoom: s.myIdentityByRoom,
        membersByRoom: s.membersByRoom,
        activeChannelByRoom: s.activeChannelByRoom,
        hostByRoom: s.hostByRoom,
        callByRoom: s.callByRoom
      })
    }
  )
);

/** Generate a random 6-digit PIN string (zero-padded). */
export function generatePin() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

/**
 * Shared empty-array fallback for selectors. Using a single stable reference
 * prevents Zustand from re-firing the subscription every render — `s.x ?? []`
 * would return a fresh `[]` each time, which trips the "getSnapshot should be
 * cached" guard and triggers an infinite update loop.
 */
export const EMPTY_LIST = Object.freeze([]) as readonly never[];
