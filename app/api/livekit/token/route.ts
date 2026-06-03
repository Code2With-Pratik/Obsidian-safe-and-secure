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
  let body: {
    roomName?: string;
    /** Optional ghost-room overrides — when set we mint the token with the
     *  ghost handle as the LiveKit `identity` + `name` so peers see
     *  "Whisper#1234" instead of the real profile. */
    ghostIdentity?: string;
    ghostName?: string;
    ghostHue?: number;
    ghostSeed?: string;
  } = {};
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

  // Verify Supabase auth before minting a token. Even ghost-room joins
  // require a real signed-in user — only the LiveKit identity is anonymized.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let identity = user.id;
  let displayName: string;
  let metadata: string;

  if (body.ghostIdentity) {
    // Ghost-room path — verify the caller is actually a member of this
    // room with the claimed handle so a user can't impersonate someone
    // else's ghost identity.
    if (roomName.startsWith("ghost-")) {
      const claimedRoomId = roomName.slice("ghost-".length);
      const { data: membership } = await supabase
        .from("ghost_room_members")
        .select("ghost_handle, ghost_hue, ghost_seed")
        .eq("room_id", claimedRoomId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership || membership.ghost_handle !== body.ghostIdentity) {
        return NextResponse.json(
          { error: "Not a member of this ghost room" },
          { status: 403 }
        );
      }
      identity = body.ghostIdentity;
      displayName = body.ghostName ?? body.ghostIdentity;
      metadata = JSON.stringify({
        ghost: true,
        hue: membership.ghost_hue,
        seed: membership.ghost_seed
      });
    } else {
      return NextResponse.json(
        { error: "ghostIdentity is only valid for ghost-* rooms" },
        { status: 400 }
      );
    }
  } else {
    // Normal call path — surface real name + avatar so peers see who's who.
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, username, avatar")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.name ?? profile?.username ?? "Guest";
    metadata = JSON.stringify({ avatar: profile?.avatar ?? null });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    metadata,
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
