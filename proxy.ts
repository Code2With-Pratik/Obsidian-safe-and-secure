import { type NextRequest, NextResponse } from "next/server";
import {
  markdownForPath,
  markdownNotFound,
  prefersMarkdown
} from "@/lib/agent-content";
import { updateSession } from "@/lib/supabase/middleware";

const KNOWN_ROUTE_PREFIXES = [
  "/2fa",
  "/api",
  "/auth",
  "/calls",
  "/chats",
  "/discover",
  "/files",
  "/ghost-rooms",
  "/login",
  "/onboarding",
  "/profile",
  "/recover",
  "/register",
  "/reset-password",
  "/settings",
  "/stories",
  "/terms",
  "/username",
  "/whiteboard"
];

function addVaryAccept(response: Response) {
  const vary = response.headers.get("Vary");
  const values = vary
    ? vary.split(",").map((value) => value.trim()).filter(Boolean)
    : [];

  if (!values.some((value) => value.toLowerCase() === "accept")) {
    values.push("Accept");
    response.headers.set("Vary", values.join(", "));
  }

  return response;
}

function markdownResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Language": "en",
      "Cache-Control": status === 200 ? "public, max-age=300" : "no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Accept"
    }
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (prefersMarkdown(request.headers.get("Accept"))) {
    const markdown = markdownForPath(pathname);
    if (markdown) return markdownResponse(markdown);

    const isKnownRoute = KNOWN_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (!isKnownRoute) return markdownResponse(markdownNotFound(pathname), 404);
  }

  return addVaryAccept(await updateSession(request));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|mp3)$).*)"
  ]
};

