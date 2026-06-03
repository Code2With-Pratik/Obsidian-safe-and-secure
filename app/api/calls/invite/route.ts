import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Mid-call invite — adds users to an already-running call session and
 * broadcasts `call:ring` on each new invitee's per-user channel. The
 * inviter must already be a participant; RLS also enforces this server-side.
 *
 *  body: { sessionId: string, userIds: string[] }
 */
export async function POST(req: Request) {
  let body: { sessionId?: string; userIds?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    /* fall through to validation */
  }

  const { sessionId, userIds } = body;
  if (!sessionId || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: "sessionId and a non-empty userIds[] are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify the session is live AND the inviter is in it.
  const { data: session } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status === "ended") {
    return NextResponse.json({ error: "Call already ended" }, { status: 410 });
  }
  if (
    session.initiator_id !== user.id &&
    !(session.joined ?? []).includes(user.id) &&
    !(session.participants ?? []).includes(user.id)
  ) {
    return NextResponse.json(
      { error: "Only participants can invite others" },
      { status: 403 }
    );
  }

  // De-dupe — drop anyone already in the session.
  const existing = new Set<string>([
    ...(session.participants ?? []),
    ...(session.joined ?? [])
  ]);
  const fresh = userIds.filter((id) => id !== user.id && !existing.has(id));
  if (fresh.length === 0) {
    return NextResponse.json({ session, invited: [] });
  }

  // Append to participants[].
  const nextParticipants = Array.from(
    new Set<string>([...(session.participants ?? []), ...fresh])
  );
  await supabase
    .from("call_sessions")
    .update({ participants: nextParticipants })
    .eq("id", sessionId);

  // Caller identity for the ring payload.
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("name, username, avatar")
    .eq("id", user.id)
    .maybeSingle();

  const ringPayload = {
    sessionId: session.id,
    chatId: session.chat_id,
    roomName: session.room_name,
    kind: session.kind,
    isGroup: true,
    isGhost: session.is_ghost,
    initiator: {
      id: user.id,
      name: callerProfile?.name ?? callerProfile?.username ?? "Caller",
      avatar: callerProfile?.avatar ?? null
    },
    startedAt: session.started_at
  };

  await Promise.all(
    fresh.map(async (uid) => {
      const ch = supabase.channel(`user-calls:${uid}`);
      await ch.send({
        type: "broadcast",
        event: "call:ring",
        payload: ringPayload
      });
      await supabase.removeChannel(ch);
    })
  );

  return NextResponse.json({ session, invited: fresh });
}
