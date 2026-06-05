import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 *  /auth/callback — destination of every Supabase OAuth provider
 *  redirect (GitHub today; Google / Apple later — same handler works).
 *
 *  Flow:
 *    1. Login page → `supabase.auth.signInWithOAuth({ provider, options:
 *       { redirectTo: '<origin>/auth/callback' } })` opens the provider
 *       consent screen.
 *    2. Provider redirects the browser back here with `?code=...` (PKCE)
 *       and an optional `?next=<path>` if we asked for one.
 *    3. We swap the code for a session cookie via
 *       `supabase.auth.exchangeCodeForSession(code)` — that cookie is
 *       what the rest of the app reads via `supabase.auth.getUser()`.
 *    4. We redirect to `next` (default '/') so the user lands on the
 *       page they expected to see after signing in.
 *
 *  If anything goes wrong (missing code, provider rejected the consent,
 *  Supabase couldn't mint a session) we redirect back to /login with a
 *  `?error=<reason>` query string the page can display.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  // The provider can also redirect with `error` + `error_description`
  // — e.g. the user clicked "cancel" on the consent screen. Surface
  // that back to the login page instead of an opaque "no code" error.
  const providerError =
    url.searchParams.get("error_description") || url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(providerError)}`, url.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Missing OAuth code")}`, url.origin)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  // Successful sign-in. Bounce to the original destination (default '/').
  return NextResponse.redirect(new URL(next, url.origin));
}
