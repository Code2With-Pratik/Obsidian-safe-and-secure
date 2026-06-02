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

  const { data: updated, error: updErr } = await supabase
    .from("call_sessions")
    .update({
      status: nextStatus,
      ended_at: new Date().toISOString()
    })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
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
