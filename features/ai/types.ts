/**
 *  Type surface for Obsidian AI — the in-app intelligent assistant.
 *
 *  The shapes here mirror OpenAI's chat-completion API closely so the wire
 *  format between client and `/api/ai/chat` can stay thin; we add a few
 *  client-only fields (display state, tool results) on top.
 */

/** One chat-completion message exchanged with the model. */
export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  /** Plain text. For `tool` messages this is the JSON-stringified result. */
  content: string;
  /** Assistant messages only: tool calls the model decided to make. */
  toolCalls?: AIToolCall[];
  /** Tool messages only: matches the assistant's toolCalls[].id. */
  toolCallId?: string;
  /** Local timestamp — ms since epoch. */
  createdAt: number;
  /** Client-only: while the model is streaming this assistant message, the
   *  text grows token by token. Persisted rows always have streaming=false. */
  streaming?: boolean;
}

/** One tool call the model wants the client to execute. */
export interface AIToolCall {
  id: string;
  name: string;
  /** Already-parsed JSON args. We keep them as a record here so the client
   *  can pass them directly to a tool handler. */
  arguments: Record<string, unknown>;
}

/** A tool result the client sends back to the model on the next round. */
export interface AIToolResult {
  toolCallId: string;
  name: string;
  /** Anything JSON-serializable; the model reads the stringified form. */
  result: unknown;
}

/** A snapshot of the user's current app state — injected into the system
 *  prompt every turn so the model can answer "what am I looking at" without
 *  asking. Built by `useAIContext`. */
export interface AIAppContext {
  user: {
    id: string;
    name: string;
    username?: string;
    avatar?: string | null;
    status?: string;
  } | null;
  /** A short label like "chats", "calls", "whiteboard" for the model to read. */
  currentScreen: string;
  /** Next.js pathname, e.g. "/chats/abc-123". */
  currentRoute: string;
  /** Populated when the route includes an active chat thread. */
  currentChat: {
    id: string;
    name: string;
    isGroup: boolean;
    memberCount?: number;
  } | null;
  /** Populated when the user is viewing a specific community. */
  currentCommunity: {
    id: string;
    name: string;
  } | null;
  /** Populated on /whiteboard while a board is active. */
  currentWhiteboard: {
    id: string;
    title: string;
    role: "owner" | "editor" | "viewer";
  } | null;
  /** Populated while in a call. */
  currentCall: {
    chatId: string;
    name: string;
    video: boolean;
    group?: boolean;
  } | null;
  /** Free-text summary the model can quote — counts of unread messages,
   *  unread notifications, recent activity. */
  summary: string;
}

/** Streaming event shapes the `/api/ai/chat` SSE endpoint emits. */
export type AIStreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool-call-start"; id: string; name: string }
  | { type: "tool-call-args"; id: string; argsDelta: string }
  | { type: "tool-call-end"; id: string }
  | { type: "done"; finishReason: "stop" | "tool_calls" | "length" | "error" }
  | { type: "error"; message: string };
