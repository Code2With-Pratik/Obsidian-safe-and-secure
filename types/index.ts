export type ID = string;

export interface UserLinks {
  website?: string;
  github?: string;
  twitter?: string;
  spotify?: string;
}

export interface User {
  id: ID;
  name: string;
  username: string;
  avatar: string;
  banner?: string;
  status: "online" | "away" | "busy" | "offline";
  /** Short tagline shown under the name in the profile header
   *  (e.g. "Designing the future, one pixel at a time."). */
  profession?: string;
  /** Longer "About me" text shown in the Bio card on the profile page. */
  bio?: string;
  pronouns?: string;
  location?: string;
  links?: UserLinks;
  isGhost?: boolean;
}

export type ChatType = "dm" | "group" | "ghost" | "secret" | "channel";

export type ChatHint =
  | { kind: "typing"; label?: string }
  | { kind: "photo"; label?: string }
  | { kind: "voice"; label?: string }
  | { kind: "video"; label?: string }
  | { kind: "file"; label?: string }
  | { kind: "draft"; label?: string };

export interface Chat {
  id: ID;
  type: ChatType;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
  pinned?: boolean;
  muted?: boolean;
  membersCount?: number;
  /** explicit member user ids — used for groups created in-app */
  memberIds?: ID[];
  description?: string;
  banner?: string;
  online?: boolean;
  /** ISO timestamp of the DM peer's last online presence, for "last seen at" */
  lastSeenAt?: string;
  encrypted?: boolean;
  color?: string;
  favorite?: boolean;
  hint?: ChatHint;
}

export type MessageKind =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "file"
  | "link"
  | "system"
  | "call"
  | "sticker"
  | "gif"
  | "poll"
  | "contact"
  | "location"
  | "schedule";

export interface Reaction {
  emoji: string;
  count: number;
  byMe?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  voters: ID[]; // user ids who voted for this option
}

export interface Message {
  id: ID;
  chatId: ID;
  authorId: ID;
  kind: MessageKind;
  content: string;
  createdAt: string;
  reactions?: Reaction[];
  replyTo?: ID;
  threadCount?: number;
  pinned?: boolean;
  edited?: boolean;
  media?: { url: string; w?: number; h?: number; alt?: string; mime?: string }[];
  voice?: { durationSec: number; waveform: number[]; url?: string };
  audio?: { url?: string; name: string; size?: number; durationSec?: number };
  file?: { url?: string; name: string; size?: number; mime?: string };
  sticker?: { src: string; alt?: string };
  gif?: { src: string; alt?: string };
  poll?: {
    question: string;
    /** Optional image shown above the question. */
    imageUrl?: string;
    options: PollOption[];
    multi?: boolean;
  };
  contacts?: { name: string; username?: string; avatar?: string }[];
  location?: { lat: number; lng: number; live?: boolean };
  /** Story-reply context — when a user replies to someone's story from the
   *  viewer, the resulting DM carries a small thumbnail + caption of the
   *  source slide so the author knows which story the reply is about. */
  storyReply?: {
    storyId: ID;
    /** Preview image (image story) or null for text-only slides. */
    src?: string;
    /** Gradient bg + text for text slides. */
    bg?: string;
    text?: string;
  };
  schedule?: {
    whenIso: string;
    message: string;
    /** If set, the scheduled item is a call invite. The bubble renders a
     *  countdown + Join button until the start time elapses. */
    callInvite?: {
      /** Shared id across every invitee's copy of the same call — used to
       *  dedupe in the Upcoming list and the View-all view. */
      callId?: string;
      video: boolean;
      title: string;
      /** Optional end time so we can show "Ends at X". */
      endsAtIso?: string;
      participantIds?: ID[];
    };
  };
  link?: { url: string; title: string; description?: string; image?: string };
  /** Optional schedule for delayed delivery — server delivers when due. */
  scheduleAt?: string;
  /** True for messages produced by Forward — the bubble renders a small
   *  "↪ Forwarded" tag above the content. */
  forwarded?: boolean;
  status?: "sending" | "sent" | "delivered" | "read" | "scheduled";
}

export interface GhostRoom {
  id: ID;
  name: string;
  topic: string;
  pin: string;
  members: number;
  capacity: number;
  expiresAt?: string;
  isLocked: boolean;
  aura: string; // gradient
  hot?: boolean;
}

export interface Story {
  id: ID;
  authorId: ID;
  type: "image" | "video" | "text";
  preview: string;
  bg?: string;
  text?: string;
  viewed?: boolean;
  postedAt: string;
}

export interface CallParticipant {
  id: ID;
  name: string;
  avatar: string;
  muted: boolean;
  cameraOn: boolean;
  speaking?: boolean;
  isMe?: boolean;
  isHost?: boolean;
}

export interface Tab {
  id: ID;
  title: string;
  url: string;
  favicon?: string;
  active?: boolean;
  secure?: boolean;
}

export interface FileItem {
  id: ID;
  name: string;
  size: number;
  type: "image" | "video" | "audio" | "doc" | "archive" | "code" | "other";
  vault?: boolean;
  updatedAt: string;
  preview?: string;
}

export interface Community {
  id: ID;
  name: string;
  cover: string;
  members: number;
  online: number;
  category: string;
  verified?: boolean;
  trending?: boolean;
  /** User id of the host — only the host can post + delete. */
  hostId?: ID;
  description?: string;
  /** Topic tags used to compute "X people match your interest" popup on join. */
  interests?: string[];
  /** Optional chat-theme id to override the user's global theme. */
  theme?: string;
}

export interface CommunityPoll {
  question: string;
  options: { id: string; label: string; votes: number }[];
}

export interface CommunitySong {
  title: string;
  artist: string;
  cover: string;
  durationSec: number;
}

export type CommunityPostKind = "text" | "image" | "video" | "song" | "poll";

export interface CommunityPost {
  id: ID;
  communityId: ID;
  authorId: ID;
  kind: CommunityPostKind;
  content?: string;
  media?: { url: string; alt?: string; kind?: "image" | "video" }[];
  song?: CommunitySong;
  poll?: CommunityPoll;
  /** User ids mentioned in this post (rendered as @handles). */
  mentions?: ID[];
  reactions?: { emoji: string; count: number; byMe: boolean }[];
  createdAt: string;
}
