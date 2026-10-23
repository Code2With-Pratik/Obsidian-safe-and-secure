import { SITE_DESCRIPTION, SITE_URL } from "./site-config";

type AcceptPreference = {
  mediaType: string;
  quality: number;
  specificity: number;
  order: number;
};

function parseAcceptHeader(header: string): AcceptPreference[] {
  return header
    .split(",")
    .map((raw, order) => {
      const [rawMediaType, ...parameters] = raw.trim().toLowerCase().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q=")
      );
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;
      const quality = Number.isFinite(parsedQuality)
        ? Math.min(1, Math.max(0, parsedQuality))
        : 0;
      const specificity = rawMediaType === "*/*" ? 0 : rawMediaType.endsWith("/*") ? 1 : 2;

      return { mediaType: rawMediaType, quality, specificity, order };
    })
    .filter(({ mediaType }) => mediaType.includes("/"))
    .sort(
      (a, b) =>
        b.quality - a.quality || b.specificity - a.specificity || a.order - b.order
    );
}

export function prefersMarkdown(acceptHeader: string | null): boolean {
  if (!acceptHeader) return false;

  for (const preference of parseAcceptHeader(acceptHeader)) {
    if (preference.quality === 0) continue;
    if (preference.mediaType === "text/markdown") return true;
    if (
      preference.mediaType === "text/html" ||
      preference.mediaType === "text/plain" ||
      preference.mediaType === "text/*" ||
      preference.mediaType === "*/*"
    ) {
      return false;
    }
  }

  return false;
}

const HOME_MARKDOWN = `# Obsidian Safe & Secure

${SITE_DESCRIPTION}

## What you can do

- Exchange real-time direct, group, channel, and secret messages.
- Start voice and video calls powered by LiveKit.
- Share stories, media, files, polls, reactions, and scheduled messages.
- Collaborate through communities, ghost rooms, and visual whiteboards.
- Keep sensitive files organized in a secure vault.
- Use the optional Obsidian AI assistant for contextual help.

## When to use Obsidian

Use Obsidian when a person or team needs one privacy-focused workspace for communication and collaboration instead of separate chat, calling, story, whiteboard, and file tools.

## Start here

- [Open Obsidian](${SITE_URL}/onboarding)
- [Sign in](${SITE_URL}/login)
- [About the platform](${SITE_URL}/about)
- [Contact and support](${SITE_URL}/contact)
- [Privacy policy](${SITE_URL}/privacy)
- [Agent instructions](${SITE_URL}/llms.txt)
- [Sitemap](${SITE_URL}/sitemap.xml)
`;

const ABOUT_MARKDOWN = `# About Obsidian Safe & Secure

Obsidian Safe & Secure is a privacy-focused communication and collaboration application. It brings messaging, calls, stories, communities, ghost rooms, whiteboards, secure file organization, and optional AI assistance into one coherent interface.

The application is designed for individuals and groups that value expressive communication without combining many disconnected products. Its web experience is built with Next.js and React, while Supabase provides authentication, persisted data, storage, and real-time synchronization. LiveKit provides real-time voice and video infrastructure.

- [Home](${SITE_URL}/)
- [Source repository](https://github.com/Code2With-Pratik/Obsidian-safe-and-secure)
- [Complete technical documentation](https://deepwiki.com/Code2With-Pratik/Obsidian-safe-and-secure)
`;

const CONTACT_MARKDOWN = `# Contact and support

Use the public project repository for reproducible bug reports, feature requests, deployment questions, and security-safe technical discussion. Before opening a report, include the affected page, expected behavior, actual behavior, browser or runtime version, and steps that reproduce the problem. Never include passwords, access tokens, private keys, message content, or other sensitive account data.

- [GitHub issues](https://github.com/Code2With-Pratik/Obsidian-safe-and-secure/issues)
- [Technical documentation](https://deepwiki.com/Code2With-Pratik/Obsidian-safe-and-secure)
- [Privacy policy](${SITE_URL}/privacy)
- [Agent instructions](${SITE_URL}/llms.txt)
`;

const PRIVACY_MARKDOWN = `# Privacy policy

Obsidian is designed around privacy-conscious communication. Account, profile, message, file, and service metadata are processed to provide authentication, messaging, calls, storage, collaboration, security, and support. The application uses Supabase for database, authentication, storage, and real-time features; LiveKit for calls; and optional providers for AI, voice synthesis, and media search.

Read the complete human-readable policy at [${SITE_URL}/privacy](${SITE_URL}/privacy), or use the [contact page](${SITE_URL}/contact) for privacy-related support guidance.
`;

const MARKDOWN_PAGES: Record<string, string> = {
  "/": HOME_MARKDOWN,
  "/about": ABOUT_MARKDOWN,
  "/contact": CONTACT_MARKDOWN,
  "/privacy": PRIVACY_MARKDOWN
};

export function markdownForPath(pathname: string): string | null {
  return MARKDOWN_PAGES[pathname] ?? null;
}

export function markdownNotFound(pathname: string): string {
  return `# 404 — Page not found

The requested path \`${pathname}\` does not exist on Obsidian Safe & Secure.

- [Return to the homepage](${SITE_URL}/)
- [Read the agent instructions](${SITE_URL}/llms.txt)
- [Browse the sitemap](${SITE_URL}/sitemap.xml)
- [Contact and support](${SITE_URL}/contact)
`;
}

export const LLMS_TEXT = `# Obsidian Safe & Secure

> ${SITE_DESCRIPTION}

Canonical site: ${SITE_URL}
Source: https://github.com/Code2With-Pratik/Obsidian-safe-and-secure
Technical wiki: https://deepwiki.com/Code2With-Pratik/Obsidian-safe-and-secure

## When to use this site

Use Obsidian when a user wants to:

- evaluate or access a unified secure communication platform;
- use real-time direct, group, channel, or secret messaging;
- coordinate voice or video calls;
- work with stories, communities, ghost rooms, whiteboards, or secure files;
- understand how the Obsidian application is deployed or configured;
- inspect its public architecture, privacy approach, or integration points.

## When not to use this site

- Do not treat Obsidian as the Obsidian.md note-taking product; they are unrelated products.
- Do not claim end-to-end encryption for data flows unless the relevant implementation explicitly guarantees it.
- Do not submit credentials, tokens, private messages, personal data, or secrets to public support channels.
- Do not assume a public automation API exists. The product currently exposes a human-facing application and documented internal routes, not a supported third-party API contract.

## How agents should interact

1. Prefer the Markdown representation of public pages by sending Accept: text/markdown.
2. Use ${SITE_URL}/sitemap.xml to discover indexable public pages.
3. Use the DeepWiki documentation for codebase and architecture questions.
4. Use the GitHub repository for source-level evidence and reproducible issue reports.
5. Direct users to the browser application for account creation, authentication, messaging, and collaboration tasks.
6. Respect authentication boundaries and never attempt to bypass protected routes.

## Primary public pages

- Home: ${SITE_URL}/
- About: ${SITE_URL}/about
- Contact and support: ${SITE_URL}/contact
- Privacy: ${SITE_URL}/privacy
- Terms: ${SITE_URL}/terms
- Sitemap: ${SITE_URL}/sitemap.xml

## Core capabilities

- Real-time messaging, presence, typing indicators, reactions, replies, and scheduled messages
- Voice and video calls with LiveKit
- Stories, media sharing, GIFs, polls, and files
- Communities and ephemeral ghost rooms
- Collaborative whiteboards and secure file organization
- Optional Gemini-powered assistant and ElevenLabs voice responses
`;

