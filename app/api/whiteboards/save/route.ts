import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 *  POST /api/whiteboards/save
 *  body: { boardId: string, elements?: unknown[], camera?: object, name?: string }
 *
 *  Persists a debounced snapshot of the board. RLS enforces that only
 *  owner / editor members can update; viewers' attempts are silently
 *  filtered (we return 403 so the client can surface a hint).
 */
export async function POST(req: Request) {
  let body: {
    boardId?: string;
    elements?: unknown[];
    camera?: { x: number; y: number; zoom: number };
    name?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* validation below */
  }
  const { boardId, elements, camera, name } = body;
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

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };
  if (Array.isArray(elements)) patch.elements = elements;
  if (camera) patch.camera = camera;
  if (typeof name === "string" && name.trim()) patch.name = name.trim();

  const { data: updated, error } = await supabase
    .from("whiteboards")
    .update(patch)
    .eq("id", boardId)
    .select("id, updated_at")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    // RLS filter — caller isn't owner or editor.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ board: updated });
}
