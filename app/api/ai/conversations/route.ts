import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 *  GET  /api/ai/conversations          → list the signed-in user's conversations
 *  POST /api/ai/conversations          → create a new conversation; returns { id }
 *
 *  RLS enforces user_id = auth.uid() on both reads and writes, so the
 *  client can't cross-pollinate threads even if it tried.
 */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(req: Request) {
  let body: { title?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is OK; we default the title */
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const title = (body.title ?? "").trim() || "New chat";
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: user.id, title })
    .select("id, title, created_at, updated_at")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create conversation" },
      { status: 500 }
    );
  }
  return NextResponse.json({ conversation: data });
}
