import { NextResponse } from "next/server";
import OpenAI from "openai";
import { AI_TOOL_DEFINITIONS } from "@/features/ai/tools/definitions";
import { buildSystemPrompt } from "@/features/ai/system-prompt";
import type { AIAppContext } from "@/features/ai/types";

export const runtime = "nodejs";
// We stream tokens — keep the request alive long enough for the full reply.
export const maxDuration = 60;

/**
 *  POST /api/ai/chat
 *
 *  Body:
 *    {
 *      messages: ChatCompletionMessage[],   // OpenAI-shape; client trims
 *                                            // anything older than the cap
 *      context:  AIAppContext               // built by useAIContext()
 *    }
 *
 *  Response: a Server-Sent Events stream with three event kinds:
 *    event: text          → data: { delta: "..." }
 *    event: tool          → data: { id, name, arguments }   (one per call,
 *                            arguments is the FULLY accumulated JSON string)
 *    event: done          → data: { finishReason }
 *
 *  Tool execution happens on the client (see useAIChat). On a tool call the
 *  client appends a `tool` message with the result and re-POSTs to this
 *  same endpoint, continuing the loop until the model finishes with
 *  `finishReason === "stop"`.
 */

interface ChatBody {
  messages?: Array<{
    role: "user" | "assistant" | "tool" | "system";
    content: string;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
    name?: string;
  }>;
  context?: AIAppContext;
}

// Default to gemini-2.0-flash-lite on the free tier — 30 RPM (vs 10-15
// on the other flash tiers), which is the binding constraint for a
// tool-calling assistant where one user message can fan out to 2-3 model
// requests. 200 RPD is fine for development; upgrade to a paid plan or
// switch to gemini-2.5-flash-lite (1000 RPD) for daily-heavy use.
const MODEL = process.env.NEXT_PUBLIC_AI_MODEL || "gemini-2.0-flash-lite";

/**
 * Resolve the Gemini API key. Returns null if not configured so the caller
 * can surface a clean 500 with setup instructions. We use Gemini's
 * OpenAI-compatible endpoint so the `openai` SDK works unchanged — only the
 * baseURL differs.
 */
function resolveLLMConfig(): { apiKey: string; baseURL: string } | null {
  if (!process.env.GEMINI_API_KEY) return null;
  return {
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
  };
}

function sseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const llm = resolveLLMConfig();
  if (!llm) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Add it to .env.local." },
      { status: 500 }
    );
  }

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }
  if (!body.context) {
    return NextResponse.json({ error: "context required" }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: llm.apiKey, baseURL: llm.baseURL });

  const systemPrompt = buildSystemPrompt(body.context);
  // We always inject the system prompt fresh — the client doesn't send it
  // so a context shift (user navigated to a different screen) is reflected
  // on the very next request.
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...body.messages.map((m) => {
      // The OpenAI SDK requires `tool_calls` only on assistant rows and
      // `tool_call_id` only on tool rows. We pass through whatever the
      // client sent — it's already shaped that way.
      const out: Record<string, unknown> = { role: m.role, content: m.content };
      if (m.tool_calls) out.tool_calls = m.tool_calls;
      if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
      if (m.name) out.name = m.name;
      return out;
    })
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // No retry-on-429: Gemini's rate-limit window is per-minute, so
        // retrying within seconds just burns more of the same quota. We
        // fail fast instead — the user sees the throttle message and
        // waits the bucket out instead of stalling 6+ seconds on retries
        // that will also fail.
        const completion = await client.chat.completions.create({
          model: MODEL,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: messages as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: AI_TOOL_DEFINITIONS as any,
          tool_choice: "auto",
          stream: true,
          temperature: 0.4
        });

        // We accumulate tool-call argument fragments as they stream because
        // OpenAI delivers them piecewise across deltas. Once finishReason
        // arrives we emit each completed call as a single SSE event.
        const toolCalls = new Map<
          number,
          { id: string; name: string; arguments: string }
        >();
        let finishReason: string | null = null;

        for await (const part of completion) {
          const delta = part.choices?.[0]?.delta;
          if (!delta) continue;

          if (typeof delta.content === "string" && delta.content.length > 0) {
            controller.enqueue(encoder.encode(sseEvent("text", { delta: delta.content })));
          }

          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const slot = toolCalls.get(idx) ?? { id: "", name: "", arguments: "" };
              if (tc.id) slot.id = tc.id;
              if (tc.function?.name) slot.name = tc.function.name;
              if (tc.function?.arguments) slot.arguments += tc.function.arguments;
              toolCalls.set(idx, slot);
            }
          }

          if (part.choices?.[0]?.finish_reason) {
            finishReason = part.choices[0].finish_reason;
          }
        }

        // Emit completed tool calls so the client can dispatch them.
        for (const tc of Array.from(toolCalls.values())) {
          controller.enqueue(
            encoder.encode(
              sseEvent("tool", {
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments
              })
            )
          );
        }

        controller.enqueue(
          encoder.encode(sseEvent("done", { finishReason: finishReason ?? "stop" }))
        );
        controller.close();
      } catch (err) {
        // Translate raw provider errors into something the user can act on.
        const e = err as { status?: number; message?: string };
        let message = e.message || (err instanceof Error ? err.message : "Unknown error");
        if (e.status === 429) {
          message =
            "Gemini rate-limit hit (free tier is 15 requests/min and ~200/day on most models). Wait a minute and try again, or upgrade your Gemini plan.";
        } else if (e.status === 401 || e.status === 403) {
          message =
            "Gemini rejected the API key (401/403). Check that GEMINI_API_KEY in .env.local is correct and the project has the Generative Language API enabled.";
        } else if (e.status === 404) {
          message = `Model "${MODEL}" not found. Try setting NEXT_PUBLIC_AI_MODEL=gemini-2.0-flash in .env.local.`;
        }
        controller.enqueue(encoder.encode(sseEvent("error", { message })));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
