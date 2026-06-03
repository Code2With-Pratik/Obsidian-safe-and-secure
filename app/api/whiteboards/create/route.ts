import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 *  POST /api/whiteboards/create
 *  body: { name?: string }
 *
 *  Creates an empty whiteboard owned by the caller. Auto-inserts an
 *  `owner` membership row so the share popover and access-listing queries
 *  see the creator consistently.
 */
export async function POST(req: Request) {
  let body: { name?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty */
  }
  const name = (body.name ?? "").trim() || "Untitled board";

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: board, error } = await supabase
    .from("whiteboards")
    .insert({ name, owner_id: user.id })
    .select("*")
    .single();
  if (error || !board) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create board" },
      { status: 500 }
    );
  }

  await supabase.from("whiteboard_members").insert({
    board_id: board.id,
    user_id: user.id,
    role: "owner"
  });

  return NextResponse.json({ board });
}
