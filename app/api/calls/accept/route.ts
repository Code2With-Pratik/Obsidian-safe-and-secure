import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Marks the authenticated user as joined on a ringing call session. Flips the
 * call to `active` on first accept and broadcasts a `call:accepted` event so
 * the caller's UI can stop ringing.
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
  if (session.status === "ended" || session.status === "rejected") {
    return NextResponse.json({ error: "Call already ended" }, { status: 410 });
  }

  const joined: string[] = Array.isArray(session.joined) ? session.joined : [];
  if (!joined.includes(user.id)) joined.push(user.id);

  const wasRinging = session.status === "ringing";

  const { data: updated, error: updErr } = await supabase
    .from("call_sessions")
    .update({
      joined,
      status: wasRinging ? "active" : session.status,
      connected_at: session.connected_at ?? new Date().toISOString()
    })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Tell everyone else on the call.
  const ch = supabase.channel(`call:${sessionId}`);
  await ch.send({
    type: "broadcast",
    event: "call:accepted",
    payload: { sessionId, userId: user.id }
  });
  await supabase.removeChannel(ch);

  return NextResponse.json({ session: updated });
}
