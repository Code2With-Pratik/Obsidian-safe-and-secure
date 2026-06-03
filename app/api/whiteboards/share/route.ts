import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 *  POST /api/whiteboards/share
 *  body: { boardId: string, userId: string, role: 'editor' | 'viewer' | 'none' }
 *
 *  Grants (or revokes) a user's access to a whiteboard. `role: 'none'`
 *  deletes their membership row. RLS guarantees only the board owner can
 *  call this successfully.
 */
export async function POST(req: Request) {
  let body: {
    boardId?: string;
    userId?: string;
    role?: "editor" | "viewer" | "none";
  } = {};
  try {
    body = await req.json();
  } catch {
    /* validation below */
  }
  const { boardId, userId, role } = body;
  if (!boardId || !userId || !role) {
    return NextResponse.json(
      { error: "boardId, userId, role required" },
      { status: 400 }
    );
  }
  if (!["editor", "viewer", "none"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (role === "none") {
    const { error } = await supabase
      .from("whiteboard_members")
      .delete()
      .eq("board_id", boardId)
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("whiteboard_members")
    .upsert(
      { board_id: boardId, user_id: userId, role },
      { onConflict: "board_id,user_id" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
