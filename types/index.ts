export type ID = string;

export interface User {
  id: ID;
  name: string;
  username: string;
  avatar: string;
  banner?: string;
  status: "online" | "away" | "busy" | "offline";
  bio?: string;
  pronouns?: string;
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
  encrypted?: boolean;
  color?: string;
  favorite?: boolean;
  hint?: ChatHint;
}

export type MessageKind =
  | "text"
  | "image"
  | "voice"
  | "file"
  | "link"
  | "system"
  | "call"
  | "sticker";

export interface Reaction {
  emoji: string;
  count: number;
  byMe?: boolean;
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
  media?: { url: string; w?: number; h?: number; alt?: string }[];
  voice?: { durationSec: number; waveform: number[] };
  link?: { url: string; title: string; description?: string; image?: string };
  status?: "sending" | "sent" | "delivered" | "read";
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
}
