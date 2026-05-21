/**
 * Placeholder API + realtime layer.
 * All functions return mock data with simulated latency so TanStack Query works realistically.
 * Swap to fetch() against a real backend when ready.
 */

import { sleep } from "@/lib/utils";
import {
  chats,
  ghostRooms,
  messagesByChat,
  stories,
  communities,
  files,
  users,
  currentUser
} from "@/lib/mock-data";

export const api = {
  async getChats() {
    await sleep(120);
    return chats;
  },
  async getMessages(chatId: string) {
    await sleep(180);
    return messagesByChat[chatId] ?? [];
  },
  async getGhostRooms() {
    await sleep(150);
    return ghostRooms;
  },
  async getStories() {
    await sleep(100);
    return stories;
  },
  async getCommunities() {
    await sleep(140);
    return communities;
  },
  async getFiles() {
    await sleep(140);
    return files;
  },
  async getMe() {
    await sleep(50);
    return currentUser;
  },
  async getUsers() {
    await sleep(80);
    return users;
  }
};

/* ---------- Realtime placeholders ---------- */

export const socketPlaceholder = {
  connect() {
    if (typeof window === "undefined") return;
    // import { io } from "socket.io-client";
    // const socket = io(process.env.NEXT_PUBLIC_WS_URL!);
    // return socket;
  },
  emit(_event: string, _payload?: unknown) {
    /* swap with socket.emit */
  },
  on(_event: string, _cb: (data: unknown) => void) {
    /* swap with socket.on */
  }
};

export const webrtcPlaceholder = {
  async startCall(_opts: { audio: boolean; video: boolean }) {
    /* swap with navigator.mediaDevices.getUserMedia + RTCPeerConnection */
    return { id: `call-${Date.now()}` };
  },
  endCall(_id: string) {
    /* close peer connection */
  }
};
