import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Schedule a call for a future time. Persists a `call_sessions` row with
 * `status='scheduled'` and `scheduled_for=<iso>`. A pg_cron job
 * (`start-scheduled-calls`, see APPLY_PENDING.sql section 18) ticks every
 * minute and flips due rows to `ringing`, at which point the existing
 * realtime listener auto-rings every participant.
 *
 *  body: {
 *    chatId: string,
 *    video: boolean,
 *    scheduledForIso: string,
 *    title?: string,
 *    isGroup?: boolean,
 *    participantIds?: string[]
 *  }
 */
export async function POST(req: Request) {
  let body: {
    chatId?: string;
    video?: boolean;
    scheduledForIso?: string;
    title?: string;
    isGroup?: boolean;
    participantIds?: string[];
  } = {};
  try {
    body = await req.json();
  } catch {
    /* fall through to validation */
  }

  const { chatId, video, scheduledForIso, title, isGroup, participantIds } = body;
  if (!chatId || !scheduledForIso) {
    return NextResponse.json(
      { error: "chatId and scheduledForIso required" },
      { status: 400 }
    );
  }

  const when = new Date(scheduledForIso);
  if (Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledForIso" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Membership check.
  const { data: myMembership } = await supabase
    .from("chat_members")
    .select("user_id")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!myMembership) {
    return NextResponse.json({ error: "Not a member of this chat" }, { status: 403 });
  }

  // Invitees — explicit list wins, else every other chat member.
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

  const roomName = `call-${chatId}-${Date.now().toString(36)}`;
  const { data: inserted, error } = await supabase
    .from("call_sessions")
    .insert({
      chat_id: chatId,
      initiator_id: user.id,
      room_name: roomName,
      kind: video ? "video" : "voice",
      status: "scheduled",
      is_group: !!isGroup,
      participants: invitees,
      joined: [user.id],
      scheduled_for: when.toISOString(),
      title: title?.trim() || "Scheduled call"
    })
    .select("*")
    .single();
  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to schedule" },
      { status: 500 }
    );
  }

  return NextResponse.json({ session: inserted });
}
