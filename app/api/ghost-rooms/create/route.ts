import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Auras the UI shows on each ghost room card. Pick deterministically from
 *  the room name + a slice of UUID so re-running create with the same name
 *  doesn't oscillate between gradients. */
const AURAS = [
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#06B6D4,#3B82F6)",
  "linear-gradient(135deg,#F59E0B,#EF4444)",
  "linear-gradient(135deg,#10B981,#06B6D4)",
  "linear-gradient(135deg,#A855F7,#22D3EE)",
  "linear-gradient(135deg,#F472B6,#A78BFA)"
];

function pickAura(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AURAS[Math.abs(h) % AURAS.length];
}

/**
 *  POST /api/ghost-rooms/create
 *
 *  body: {
 *    name: string,
 *    topic?: string,
 *    isLocked: boolean,
 *    pin?: string,          // required when isLocked=true
 *    capacity: number,      // 5..200
 *    autoCloseHours?: number  // 0 = no auto-close
 *  }
 */
export async function POST(req: Request) {
  let body: {
    name?: string;
    topic?: string;
    isLocked?: boolean;
    pin?: string;
    capacity?: number;
    autoCloseHours?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* validation below */
  }

  const name = (body.name ?? "").trim() || "Untitled ghost room";
  const topic = (body.topic ?? "").trim() || null;
  const isLocked = !!body.isLocked;
  const pin = isLocked ? (body.pin ?? "").trim() : null;
  const capacity = Math.max(
    5,
    Math.min(200, Math.floor(body.capacity ?? 40))
  );
  const hours = Math.max(0, Math.min(72, body.autoCloseHours ?? 0));
  const expiresAt =
    hours > 0
      ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      : null;

  if (isLocked && (!pin || !/^\d{4,6}$/.test(pin))) {
    return NextResponse.json(
      { error: "Locked rooms require a 4-6 digit PIN" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const aura = pickAura(name + user.id);

  const { data: room, error } = await supabase
    .from("ghost_rooms")
    .insert({
      name,
      topic,
      pin,
      is_locked: isLocked,
      capacity,
      aura,
      hot: false,
      host_id: user.id,
      expires_at: expiresAt
    })
    .select("*")
    .single();
  if (error || !room) {
    console.warn("[ghost-rooms/create] insert failed:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create room" },
      { status: 500 }
    );
  }

  // Auto-join the host with a random ghost identity so the room shows at
  // least one member immediately.
  const handle = `Whisper#${Math.floor(1000 + Math.random() * 9000)}`;
  const hue = Math.floor(Math.random() * 360);
  const seed = Math.random().toString(36).slice(2, 8);
  await supabase.from("ghost_room_members").insert({
    room_id: room.id,
    user_id: user.id,
    ghost_handle: handle,
    ghost_hue: hue,
    ghost_seed: seed
  });

  return NextResponse.json({
    room,
    membership: { ghost_handle: handle, ghost_hue: hue, ghost_seed: seed }
  });
}
