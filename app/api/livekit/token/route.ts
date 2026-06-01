import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

/**
 * Mints a short-lived LiveKit access token for the authenticated user, scoped
 * to a single room. The client calls this from the active-call page right
 * before connecting to a `LiveKitRoom`.
 *
 * Required env vars (set in `.env.local`):
 *   LIVEKIT_URL              (e.g. wss://your-project.livekit.cloud)
 *   LIVEKIT_API_KEY
 *   LIVEKIT_API_SECRET
 *   NEXT_PUBLIC_LIVEKIT_URL  (same wss URL, exposed to the browser)
 */
export async function POST(req: Request) {
  let body: { roomName?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body */
  }
  const roomName = body.roomName;
  if (!roomName) {
    return NextResponse.json({ error: "roomName required" }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    return NextResponse.json(
      { error: "LiveKit is not configured. Set LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET." },
      { status: 500 }
    );
  }

  // Verify Supabase auth before minting a token.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Pull display name + avatar so other peers see a real identity, not a uuid.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, username, avatar")
    .eq("id", user.id)
    .maybeSingle();

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile?.name ?? profile?.username ?? "Guest",
    metadata: JSON.stringify({ avatar: profile?.avatar ?? null }),
    // Tokens are valid for 6h — plenty for a single call, short enough to
    // limit blast radius if leaked.
    ttl: 60 * 60 * 6
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  const token = await at.toJwt();
  return NextResponse.json({ token, url });
}
