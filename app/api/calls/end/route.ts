import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Ends a call session. If the call is still ringing (no one accepted) and the
 * initiator is the one ending, it becomes `missed`; otherwise `ended`.
 */
export async function POST(req: Request) {
  let body: { sessionId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body — handled below */
  }
  const { sessionId } = body;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: session, error: fetchErr } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (fetchErr || !session) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }
  if (session.status === "ended" || session.status === "rejected" || session.status === "missed") {
    return NextResponse.json({ session });
  }

  const stillRinging = session.status === "ringing";
  const initiatorEnding = session.initiator_id === user.id;
  const nextStatus = stillRinging && initiatorEnding ? "missed" : "ended";

  // Duration = connected_at → now (if it ever connected). Ringing-only
  // calls have duration 0.
  const endedAtIso = new Date().toISOString();
  const durationSec =
    session.connected_at && nextStatus === "ended"
      ? Math.max(
          0,
          Math.round(
            (new Date(endedAtIso).getTime() -
              new Date(session.connected_at).getTime()) /
              1000
          )
        )
      : 0;

  const { data: updated, error: updErr } = await supabase
    .from("call_sessions")
    .update({
      status: nextStatus,
      ended_at: endedAtIso,
      duration_seconds: durationSec
    })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Post a chat message summarizing the call so it shows up in the chat
  // thread just like WhatsApp. The bubble UI (kind:'call') will read the
  // payload fields and render the right icon + direction + duration.
  //
  // `direction` is stored relative to the INITIATOR — the client flips
  // it on render based on whether the viewer is the author. We persist
  // it as 'outgoing' for the initiator's perspective.
  const callPayload = {
    sessionId: session.id,
    direction: "outgoing" as const,
    status: nextStatus,
    durationSec,
    video: session.kind === "video",
    ghost: !!session.is_ghost
  };

  // The call author of record is the initiator (so "you called Alice"
  // reads correctly from either side via the directional flip in the
  // bubble).
  try {
    await supabase.from("messages").insert({
      chat_id: session.chat_id,
      author_id: session.initiator_id,
      kind: "call",
      content: "",
      status: "sent",
      payload: { call: callPayload }
    });
  } catch (err) {
    // Don't block the end response on message insertion — the call still
    // wraps even if the chat row fails for some reason.
    console.warn("[calls/end] message insert failed:", err);
  }

  const ch = supabase.channel(`call:${sessionId}`);
  await ch.send({
    type: "broadcast",
    event: "call:ended",
    payload: { sessionId, userId: user.id, status: nextStatus }
  });
  await supabase.removeChannel(ch);

  return NextResponse.json({ session: updated });
}
