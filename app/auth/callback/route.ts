import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * /auth/callback — destination of every Supabase OAuth redirect
 * and email magic/recovery link.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/chats";

  const providerError =
    url.searchParams.get("error_description") ??
    url.searchParams.get("error");

  // Use the public URL instead of request.url.origin
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://obsidian-safe-and-secure.onrender.com";

  if (providerError) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(providerError)}`,
        baseUrl
      )
    );
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, baseUrl));
    }

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}`,
        baseUrl
      )
    );
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, baseUrl));
    }

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}`,
        baseUrl
      )
    );
  }

  if (next && next !== "/" && next.startsWith("/")) {
    return NextResponse.redirect(new URL(next, baseUrl));
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent(
        "Invalid or missing recovery token"
      )}`,
      baseUrl
    )
  );
}