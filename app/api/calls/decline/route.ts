import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Records a decline from the authenticated user. If every invitee has now
 * declined and nobody has joined, the call flips to `rejected`.
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
    return NextResponse.json({ session });
  }

  const declined: string[] = Array.isArray(session.declined) ? session.declined : [];
  if (!declined.includes(user.id)) declined.push(user.id);

  const participants: string[] = Array.isArray(session.participants) ? session.participants : [];
  const joined: string[] = Array.isArray(session.joined) ? session.joined : [];
  // Has every invitee responded with a decline? Initiator is in `joined`
  // automatically, so the check is "no other joined participant AND every
  // invitee declined".
  const everyoneDeclined =
    participants.length > 0 &&
    participants.every((p) => declined.includes(p)) &&
    joined.filter((id) => id !== session.initiator_id).length === 0;

  const next = everyoneDeclined
    ? { declined, status: "rejected", ended_at: new Date().toISOString() }
    : { declined };

  const { data: updated, error: updErr } = await supabase
    .from("call_sessions")
    .update(next)
    .eq("id", sessionId)
    .select("*")
    .single();
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const ch = supabase.channel(`call:${sessionId}`);
  await ch.send({
    type: "broadcast",
    event: "call:declined",
    payload: {
      sessionId,
      userId: user.id,
      rejected: everyoneDeclined
    }
  });
  await supabase.removeChannel(ch);

  return NextResponse.json({ session: updated });
}
