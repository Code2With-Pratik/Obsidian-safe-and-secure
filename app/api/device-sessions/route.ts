import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function deviceKindFromUa(ua: string): "laptop" | "phone" | "tablet" | "monitor" {
  if (/iPad|iPod/.test(ua)) return "tablet";
  if (/iPhone/.test(ua) || /Android/.test(ua)) return "phone";
  if (/Macintosh|Mac OS|Windows|Linux/.test(ua)) return "laptop";
  return "monitor";
}

function browserFromUa(ua: string) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
}

function platformFromUa(ua: string) {
  if (/Windows/.test(ua)) return "Windows";
  if (/Macintosh|Mac OS/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown platform";
}

function deviceNameFromUa(ua: string) {
  if (/iPad/.test(ua)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android device";
  if (/Macintosh|Mac OS/.test(ua)) return "MacBook";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux device";
  return "Unknown device";
}

function formatAccessTime(value?: string | null) {
  if (!value) return "Active now";
  const stamp = new Date(value).getTime();
  if (Number.isNaN(stamp)) return "Active now";
  const diffMs = Date.now() - stamp;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Active now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(stamp).toLocaleString();
}

function sessionFingerprint(accessToken?: string | null) {
  if (!accessToken) return null;
  return accessToken.slice(0, 24);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const currentToken = session?.access_token ?? null;
  const currentFingerprint = sessionFingerprint(currentToken);

  const { data, error } = await supabase
    .from("device_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions = (data ?? []).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    kind: row.device_kind,
    name: row.device_name,
    location: row.location || "Unknown location",
    lastActive: formatAccessTime(row.last_seen_at),
    browser: row.browser || "Unknown browser",
    platform: row.platform || "Unknown platform",
    current: row.session_id === currentFingerprint,
    accessToken: row.access_token,
  }));

  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "upsert" | "signout";
    sessionId?: string;
    accessToken?: string;
    browser?: string;
    platform?: string;
    deviceName?: string;
    location?: string;
    deviceKind?: "laptop" | "phone" | "tablet" | "monitor";
  };

  if (body.action === "signout") {
    const sessionRow = await supabase
      .from("device_sessions")
      .select("*")
      .eq("id", body.sessionId)
      .maybeSingle();

    if (sessionRow.error) {
      return NextResponse.json({ error: sessionRow.error.message }, { status: 500 });
    }

    if (!sessionRow.data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });
    }

    const { error: signOutError } = await admin.auth.admin.signOut(
      sessionRow.data.access_token,
      "local"
    );

    if (signOutError) {
      return NextResponse.json({ error: signOutError.message }, { status: 500 });
    }

    const { error: deleteError } = await supabase
      .from("device_sessions")
      .delete()
      .eq("id", sessionRow.data.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = body.accessToken ?? session?.access_token;

  if (!accessToken) {
    return NextResponse.json({ error: "Missing session token" }, { status: 400 });
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = body.browser || browserFromUa(ua);
  const platform = body.platform || platformFromUa(ua);
  const deviceName = body.deviceName || deviceNameFromUa(ua);
  const deviceKind = body.deviceKind || deviceKindFromUa(ua);
  const location = body.location || "Unknown location";
  const sessionId = sessionFingerprint(accessToken) ?? accessToken.slice(0, 24);

  const { error: upsertError } = await supabase.from("device_sessions").upsert(
    {
      user_id: user.id,
      session_id: sessionId,
      access_token: accessToken,
      device_name: deviceName,
      browser,
      platform,
      location,
      device_kind: deviceKind,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
