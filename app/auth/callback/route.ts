import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 *  /auth/callback — destination of every Supabase OAuth redirect & email magic link / recovery link.
 */
export async function GET(request: Request) {
  console.log("request.url =", request.url);
  const url = new URL(request.url);
  console.log("origin =", url.origin);

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/chats";

  const providerError =
    url.searchParams.get("error_description") || url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(providerError)}`, url.origin)
    );
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  // If no server-side token was present, bounce to the next target if provided (e.g. /reset-password)
  // so client-side hash processing (#access_token=...) can complete, or default to /login.
  if (next && next !== "/" && next.startsWith("/")) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("Invalid or missing recovery token")}`, url.origin)
  );
}
