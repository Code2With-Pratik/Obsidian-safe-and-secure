import { NextResponse } from "next/server";

export const runtime = "nodejs";
// TTS streams audio — keep the request open until the model finishes.
export const maxDuration = 30;

/**
 *  POST /api/ai/voice
 *
 *  Body: { text: string, voiceId?: string }
 *  Response: streaming audio/mpeg from ElevenLabs.
 *
 *  We proxy through the server instead of letting the browser call
 *  ElevenLabs directly because the API key is a server secret. The
 *  response stream is forwarded byte-for-byte so the client can play
 *  audio chunks as soon as they arrive (low TTFA — under 200ms on the
 *  turbo model).
 */
export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured. Add it to .env.local." },
      { status: 500 }
    );
  }

  let body: { text?: string; voiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  // Cap to ~1 minute of speech to avoid blowing the user's TTS quota on a
  // runaway response. The model is instructed to keep replies brief but
  // belt-and-braces.
  const safeText = text.length > 1500 ? text.slice(0, 1500) + "…" : text;

  const voiceId =
    body.voiceId ||
    process.env.ELEVENLABS_VOICE_ID ||
    "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — built-in default
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text: safeText,
        model_id: modelId,
        // Default voice settings tuned for natural conversational tone.
        // `stability=0.5` keeps the voice steady without being monotone,
        // `similarity_boost=0.75` preserves the clone's character, and
        // `style=0.3` adds a touch of expressiveness for short replies.
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        }
      })
    }
  );

  if (!upstream.ok || !upstream.body) {
    const raw = await upstream.text().catch(() => "");
    let detail = raw;
    // Translate ElevenLabs' most common free-tier 402 into something
    // actionable. The "library voice via API" rule trips up nearly every
    // first-time setup — surface the fix inline so the user doesn't have
    // to read the raw JSON.
    try {
      const parsed = JSON.parse(raw) as {
        detail?: { code?: string; message?: string };
      };
      const code = parsed?.detail?.code ?? "";
      const msg = parsed?.detail?.message ?? raw;
      if (code === "paid_plan_required" || /library voice/i.test(msg)) {
        detail =
          `Voice "${voiceId}" is a library/cloned voice — ElevenLabs free tier blocks those via the API. ` +
          `Switch ELEVENLABS_VOICE_ID in .env.local to a PREMADE voice. ` +
          `Suggestions: 21m00Tcm4TlvDq8ikWAM (Rachel), EXAVITQu4vr4xnSDxMaL (Sarah), AZnzlk1XvdvUeBnXmlld (Domi), TxGEqnHWrfWFTfGW9XjX (Josh), pNInz6obpgDQGcFmaJgB (Adam).`;
      } else if (msg) {
        detail = msg;
      }
    } catch {
      /* not JSON — keep raw text as-is */
    }
    return NextResponse.json(
      { error: `ElevenLabs ${upstream.status}: ${detail}` },
      { status: 502 }
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    }
  });
}
