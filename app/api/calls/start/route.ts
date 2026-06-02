import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a `call_sessions` row for an outgoing call and broadcasts a
 * `call:ring` event over each invitee's per-user channel so their UI can pop
 * the incoming-call modal. The actual media plane is LiveKit — clients fetch
 * a token from `/api/livekit/token` using the returned `roomName`.
 */
export async function POST(req: Request) {
  let body: {
    chatId?: string;
    video?: boolean;
    isGroup?: boolean;
    isGhost?: boolean;
    /** Optional explicit invitee list. When omitted we ring every other chat
     *  member. */
    participantIds?: string[];
  } = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body — fall through to validation below */
  }

  const { chatId, video, isGroup, isGhost, participantIds } = body;
  if (!chatId) {
    return NextResponse.json({ error: "chatId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Membership check — RLS would also block, but we want a clean 403 error.
  const { data: myMembership } = await supabase
    .from("chat_members")
    .select("user_id")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!myMembership) {
    return NextResponse.json({ error: "Not a member of this chat" }, { status: 403 });
  }

  // Resolve invitees — explicit list wins, else every other chat member.
  let invitees: string[] = [];
  if (Array.isArray(participantIds) && participantIds.length > 0) {
    invitees = participantIds.filter((id) => id !== user.id);
  } else {
    const { data: members } = await supabase
      .from("chat_members")
      .select("user_id")
      .eq("chat_id", chatId);
    invitees = (members ?? [])
      .map((m) => m.user_id as string)
      .filter((id) => id !== user.id);
  }

  if (invitees.length === 0) {
    return NextResponse.json({ error: "No invitees" }, { status: 400 });
  }

  // Reuse an in-flight call for this chat if one is already live — clicking
  // Phone twice shouldn't spawn duplicate sessions.
  const { data: existing } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("chat_id", chatId)
    .in("status", ["ringing", "active"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let session = existing;

  if (!session) {
    const roomName = `call-${chatId}-${Date.now().toString(36)}`;
    const { data: inserted, error } = await supabase
      .from("call_sessions")
      .insert({
        chat_id: chatId,
        initiator_id: user.id,
        room_name: roomName,
        kind: video ? "video" : "voice",
        is_group: !!isGroup,
        is_ghost: !!isGhost,
        participants: invitees,
        joined: [user.id]
      })
      .select("*")
      .single();
    if (error || !inserted) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create call" },
        { status: 500 }
      );
    }
    session = inserted;
  }

  // Hydrate the ring payload with caller identity so the recipient modal can
  // render the right avatar + name without a roundtrip.
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
    isGroup: session.is_group,
    isGhost: session.is_ghost,
    initiator: {
      id: user.id,
      name: callerProfile?.name ?? callerProfile?.username ?? "Caller",
      avatar: callerProfile?.avatar ?? null
    },
    startedAt: session.started_at
  };

  // Fan out the ring on each invitee's per-user broadcast channel. The
  // recipient subscribes to `user-calls:<theirId>` via use-call-store.
  await Promise.all(
    invitees.map(async (uid) => {
      const ch = supabase.channel(`user-calls:${uid}`);
      await ch.send({
        type: "broadcast",
        event: "call:ring",
        payload: ringPayload
      });
      // Realtime channels created server-side are short-lived; unsubscribe to
      // free the connection.
      await supabase.removeChannel(ch);
    })
  );

  return NextResponse.json({ session, ring: ringPayload });
}
