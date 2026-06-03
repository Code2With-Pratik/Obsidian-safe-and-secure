import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 *  POST /api/whiteboards/delete
 *  body: { boardId: string }
 *
 *  Deletes a whiteboard the caller owns. RLS already restricts DELETE to
 *  owners, and ON DELETE CASCADE on whiteboard_members cleans up the
 *  member roster as a side effect. We also belt-and-braces with an
 *  explicit `.eq('owner_id', user.id)` so the API can return a clean
 *  403 when a non-owner attempts a delete (RLS would otherwise silently
 *  return zero rows, which the client can't distinguish from "already
 *  deleted").
 */
export async function POST(req: Request) {
  let body: { boardId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* validation below */
  }
  const { boardId } = body;
  if (!boardId) {
    return NextResponse.json({ error: "boardId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: deleted, error } = await supabase
    .from("whiteboards")
    .delete()
    .eq("id", boardId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!deleted) {
    // Row either doesn't exist or caller isn't the owner — both surface
    // as "no permission" from the client's perspective.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
