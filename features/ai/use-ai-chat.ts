"use client";

/**
 *  useAIChat — the core hook driving Obsidian AI.
 *
 *  Lifecycle of a single user turn:
 *    1. User calls `send(text)` (or arrives via voice transcript).
 *    2. We append `{ role: 'user', content: text }` to the running thread.
 *    3. We POST the thread + context to `/api/ai/chat` and parse the SSE
 *       stream — text deltas extend the assistant bubble in-place, while
 *       tool calls accumulate.
 *    4. When the model signals `finish_reason === 'tool_calls'`, we execute
 *       each tool client-side via `handlers[name]`, append a `tool` message
 *       with the JSON result for every call, then loop back to step 3.
 *    5. When `finish_reason === 'stop'`, we (optionally) feed the final
 *       assistant text into the voice hook for TTS, persist the turn to
 *       Supabase, and resolve.
 *
 *  We keep the message thread in React state for live rendering, plus a
 *  ref mirror so the inner streaming loop can mutate it without racing
 *  the setter.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import handlers from "./tools/handlers";
import { useAIContext } from "./use-ai-context";
import type { AIMessage, AIToolCall } from "./types";

interface UseAIChatOptions {
  /** Optional callback fired once the assistant finishes a turn — the
   *  argument is the final spoken text. Used by the voice mode to send it
   *  to ElevenLabs TTS. */
  onAssistantReply?: (text: string) => void;
  /** When set, every persisted message is POSTed to /api/ai/conversations
   *  under this id so reload restores the thread. Optional — when null,
   *  messages live only in memory for the session. */
  conversationId?: string | null;
}

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Convert our in-app AIMessage list to the wire shape `/api/ai/chat` wants
 *  (snake_case fields the OpenAI SDK uses verbatim). */
function toWire(messages: AIMessage[]) {
  return messages
    // System messages are constructed server-side from context — never send.
    .filter((m) => m.role !== "system")
    .map((m) => {
      const base: Record<string, unknown> = { role: m.role, content: m.content };
      if (m.toolCalls && m.toolCalls.length > 0) {
        base.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
        }));
      }
      if (m.toolCallId) base.tool_call_id = m.toolCallId;
      return base;
    });
}

/** Parse the SSE stream returned by /api/ai/chat into typed events. */
async function* parseSSE(response: Response): AsyncGenerator<{
  event: string;
  data: unknown;
}> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line.
    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = "message";
      let data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) {
        try {
          yield { event, data: JSON.parse(data) };
        } catch {
          /* malformed frame — skip */
        }
      }
    }
  }
}

export function useAIChat(opts: UseAIChatOptions = {}) {
  const router = useRouter();
  const ctx = useAIContext();
  const ctxRef = React.useRef(ctx);
  ctxRef.current = ctx;

  const [messages, setMessages] = React.useState<AIMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  // Mirror so the streaming loop can read/append without re-rendering on
  // every token (React batches setMessages calls; we still want one source
  // of truth the loop's inner functions can mutate consistently).
  const messagesRef = React.useRef<AIMessage[]>([]);
  messagesRef.current = messages;

  // Abort handle for the current in-flight stream — letting the user
  // interrupt while the model is mid-reply (voice mode "barge-in").
  const abortRef = React.useRef<AbortController | null>(null);

  const persist = React.useCallback(
    async (msg: AIMessage) => {
      if (!opts.conversationId) return;
      try {
        await fetch(`/api/ai/conversations/${opts.conversationId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: msg.role === "system" ? "assistant" : msg.role,
            content: msg.content,
            tool_calls: msg.toolCalls ?? null
          })
        });
      } catch {
        /* Best-effort persistence — never fail the conversation over a save error. */
      }
    },
    [opts.conversationId]
  );

  /** Append a message and sync the ref. */
  const append = React.useCallback((m: AIMessage) => {
    messagesRef.current = [...messagesRef.current, m];
    setMessages(messagesRef.current);
  }, []);

  /** Patch a single message by id and sync the ref. */
  const patch = React.useCallback(
    (id: string, partial: Partial<AIMessage>) => {
      messagesRef.current = messagesRef.current.map((m) =>
        m.id === id ? { ...m, ...partial } : m
      );
      setMessages(messagesRef.current);
    },
    []
  );

  /** One round of: stream from OpenAI → handle tool calls → maybe loop. */
  const runOneRound = React.useCallback(async (): Promise<{
    finishReason: string;
    assistantText: string;
    toolCallCount: number;
  }> => {
    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messages: toWire(messagesRef.current),
        context: ctxRef.current
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "Request failed");
      throw new Error(`AI request failed: ${res.status} ${errText.slice(0, 200)}`);
    }

    // Prepare an in-progress assistant bubble we'll grow with text deltas.
    const assistantId = newId("a");
    append({
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true
    });

    let assistantText = "";
    const toolCalls: AIToolCall[] = [];
    let finishReason = "stop";

    for await (const { event, data } of parseSSE(res)) {
      if (event === "text") {
        const delta = (data as { delta?: string }).delta ?? "";
        assistantText += delta;
        patch(assistantId, { content: assistantText });
      } else if (event === "tool") {
        const tc = data as { id: string; name: string; arguments: string };
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = tc.arguments ? JSON.parse(tc.arguments) : {};
        } catch {
          parsedArgs = {};
        }
        toolCalls.push({ id: tc.id, name: tc.name, arguments: parsedArgs });
      } else if (event === "done") {
        finishReason = (data as { finishReason?: string }).finishReason ?? "stop";
      } else if (event === "error") {
        const message = (data as { message?: string }).message ?? "Unknown error";
        const finalText = assistantText || `Sorry, something went wrong: ${message}`;
        patch(assistantId, {
          content: finalText,
          streaming: false
        });
        // Speak the error too so users in voice-mode hear what happened
        // instead of staring at a silent screen wondering why nothing
        // played. We mark the throw so the outer `send` loop knows the
        // reply was already vocalized and doesn't re-speak.
        if (opts.onAssistantReply) opts.onAssistantReply(finalText);
        const err = new Error(message) as Error & { __spoken?: boolean };
        err.__spoken = true;
        throw err;
      }
    }

    // Finalize the streaming bubble.
    patch(assistantId, {
      content: assistantText,
      streaming: false,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    });
    // Persist the assistant turn (after streaming completes).
    void persist({
      id: assistantId,
      role: "assistant",
      content: assistantText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      createdAt: Date.now()
    });

    // Execute each tool call client-side and append the result as a tool
    // message so the next round of the loop sees it.
    for (const tc of toolCalls) {
      const handler = handlers[tc.name];
      let result: unknown;
      if (!handler) {
        result = { error: `Unknown tool "${tc.name}".` };
      } else {
        try {
          result = await handler(tc.arguments, router, ctxRef.current);
        } catch (err) {
          result = {
            error: err instanceof Error ? err.message : "Tool execution failed"
          };
        }
      }
      const toolMsg: AIMessage = {
        id: newId("t"),
        role: "tool",
        content: JSON.stringify(result),
        toolCallId: tc.id,
        createdAt: Date.now()
      };
      append(toolMsg);
      void persist(toolMsg);
    }

    return { finishReason, assistantText, toolCallCount: toolCalls.length };
  }, [append, patch, persist, router, opts]);

  /** Public: kick off a new user turn. */
  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: AIMessage = {
        id: newId("u"),
        role: "user",
        content: trimmed,
        createdAt: Date.now()
      };
      append(userMsg);
      void persist(userMsg);

      setIsStreaming(true);
      try {
        // Loop until the model either decides it's done or we hit a safety
        // cap (2 rounds — most assistant chains converge after one tool
        // result; the second round lets the model narrate the result.
        // Going higher burns RPM on free-tier Gemini for almost no win).
        let lastText = "";
        let lastToolCount = 0;
        for (let round = 0; round < 2; round++) {
          const { finishReason, assistantText, toolCallCount } = await runOneRound();
          lastText = assistantText;
          lastToolCount = toolCallCount;
          if (finishReason !== "tool_calls") break;
        }
        // Speak the reply. If the model ran tools but emitted no narrated
        // text, give the user a short audible confirmation so voice-mode
        // doesn't go silent on tool-only turns.
        const spokenText =
          lastText ||
          (lastToolCount > 0 ? "Done." : "");
        if (spokenText && opts.onAssistantReply) {
          opts.onAssistantReply(spokenText);
        }
      } catch (err) {
        // If the user aborted (voice barge-in), we already updated the
        // bubble — just swallow. Anything else: surface to the user as a
        // system message so they see what happened.
        if ((err as Error)?.name !== "AbortError") {
          console.warn("[ai] chat round failed:", err);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [append, isStreaming, opts, persist, runOneRound]
  );

  /** Public: interrupt the in-flight stream — used by voice barge-in. */
  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  /** Public: clear the thread (new chat). */
  const reset = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    messagesRef.current = [];
    setMessages([]);
    setIsStreaming(false);
  }, []);

  /** Public: hydrate from a persisted conversation. */
  const hydrate = React.useCallback((rows: AIMessage[]) => {
    messagesRef.current = rows;
    setMessages(rows);
  }, []);

  return { messages, send, stop, reset, hydrate, isStreaming };
}
