import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 *  POST /api/ghost-rooms/join
 *
 *  body: { roomId: string, pin?: string }
 *
 *  • If the room is locked, `pin` must match.
 *  • Capacity is checked before insert (excess members are rejected).
 *  • If the caller is already a member we just return their existing
 *    ghost identity (idempotent).
 *  • Otherwise we mint a fresh `Whisper#NNNN` handle + random hue +
 *    avatar seed and INSERT into ghost_room_members.
 */
export async function POST(req: Request) {
  let body: { roomId?: string; pin?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* validation below */
  }
  const { roomId, pin } = body;
  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: room, error: roomErr } = await supabase
    .from("ghost_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (roomErr || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Auto-evict expired rooms inline — the cron sweeps but a request
  // landing in-between should also see "Room closed".
  if (room.expires_at && new Date(room.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Room closed" }, { status: 410 });
  }

  if (room.is_locked) {
    if (!pin || pin.trim() !== (room.pin ?? "")) {
      return NextResponse.json({ error: "Wrong PIN" }, { status: 403 });
    }
  }

  // Already a member? Return their existing identity.
  const { data: existing } = await supabase
    .from("ghost_room_members")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ room, membership: existing });
  }

  // Capacity check — count members and reject if full.
  const { count } = await supabase
    .from("ghost_room_members")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if ((count ?? 0) >= room.capacity) {
    return NextResponse.json({ error: "Room is full" }, { status: 409 });
  }

  const handle = `Whisper#${Math.floor(1000 + Math.random() * 9000)}`;
  const hue = Math.floor(Math.random() * 360);
  const seed = Math.random().toString(36).slice(2, 8);

  const { data: membership, error: insErr } = await supabase
    .from("ghost_room_members")
    .insert({
      room_id: roomId,
      user_id: user.id,
      ghost_handle: handle,
      ghost_hue: hue,
      ghost_seed: seed
    })
    .select("*")
    .single();
  if (insErr || !membership) {
    return NextResponse.json(
      { error: insErr?.message ?? "Failed to join" },
      { status: 500 }
    );
  }

  return NextResponse.json({ room, membership });
}
