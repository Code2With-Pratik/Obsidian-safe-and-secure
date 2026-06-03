import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 *  POST /api/ghost-rooms/leave
 *
 *  body: { roomId: string }
 *
 *  Removes the caller's membership row. If the leaver was the host AND
 *  the room is now empty, we also delete the room itself so empty
 *  ghost rooms don't accumulate.
 */
export async function POST(req: Request) {
  let body: { roomId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* validation below */
  }
  const { roomId } = body;
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

  const { error: delErr } = await supabase
    .from("ghost_room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // If the leaver was the host AND the room is now empty, drop the
  // room. Host_id check uses RLS (only the host can delete).
  const { count } = await supabase
    .from("ghost_room_members")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if ((count ?? 0) === 0) {
    await supabase.from("ghost_rooms").delete().eq("id", roomId);
  }

  return NextResponse.json({ ok: true });
}
