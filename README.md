<p align="center">
  <img src="public/og-default.jpg" alt="Obsidian — The Future of Communication" width="100%" />
</p>

<h1 align="center">Obsidian</h1>

<p align="center">
  <strong>The Future of Communication.</strong><br/>
  A futuristic communication OS — real-time chats, stories, voice & video calls, ghost rooms, communities, a collaborative whiteboard and an encrypted vault, all wrapped in a luminous glassmorphic interface and backed by Supabase + LiveKit.
</p>

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/3108cfbc-944c-49df-b03b-e7cd3298f530" />


<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss" />
  <img alt="Framer Motion" src="https://img.shields.io/badge/Framer_Motion-11-FF2BC2?logo=framer" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase" />
  <img alt="LiveKit" src="https://img.shields.io/badge/LiveKit-Cloud-FF3366" />
</p>

> Think Telegram × Discord × Instagram × WhatsApp × Linear × Arc — distilled into a single secure, animated OS for messages, calls, ghost rooms, stories, files and whiteboards. Built with a real-time Supabase backend and a LiveKit-powered call stack.

> **Complete documentation:** Browse the architecture, codebase, and implementation guides on [DeepWiki](https://deepwiki.com/Code2With-Pratik/Obsidian-safe-and-secure).

<p align="center">
  <a href="#docker-quick-start"><img alt="Docker quick start" src="https://img.shields.io/badge/Quick_Start-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
  <a href="#getting-started-from-source"><img alt="Source setup" src="https://img.shields.io/badge/Setup-From_Source-6F42C1?style=for-the-badge&logo=github&logoColor=white" /></a>
  <a href="https://deepwiki.com/Code2With-Pratik/Obsidian-safe-and-secure"><img alt="Open DeepWiki" src="https://img.shields.io/badge/Docs-DeepWiki-16A34A?style=for-the-badge&logo=readthedocs&logoColor=white" /></a>
</p>

---

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Tech stack](#tech-stack)
5. [Docker quick start](#docker-quick-start)
6. [Getting started from source](#getting-started-from-source)
7. [Supabase setup](#supabase-setup)
8. [LiveKit setup](#livekit-setup)
9. [Environment variables](#environment-variables)
10. [Scripts](#scripts)
11. [Project structure](#project-structure)
12. [Realtime channels](#realtime-channels)
13. [Internationalization](#internationalization)
14. [Keyboard shortcuts](#keyboard-shortcuts)
15. [Notes & caveats](#notes--caveats)

---

## Overview

Obsidian is a premium, production-grade communication platform built on **Next.js 16 (App Router)** with **React 19**. Every surface is fully wired end-to-end to a **Supabase** backend (Postgres + Auth + Realtime + Storage + pg_cron) and a **LiveKit Cloud** call stack — chats, stories, presence, typing, reactions, calls, scheduled messages, blocked users and storage all persist and sync across devices in real time.

The product ships with a theme engine (dark / light / system + accent colors + glass intensity), 9-language internationalization with RTL, a command palette, a **native AI assistant also named Obsidian**, route-level skeleton loaders, and motion polish on every interaction.

---

## Features

### 💬 Chats — full-stack real-time
- **DMs, groups, channels, and secret chats**, with member add/remove dialogs and "Block contact" / "Clear chat" / "Export chat" actions.
- **Rich messages**: text, **voice notes** with live waveform, images & videos, stickers, **GIFs** (Klipy), memes, **polls** (with image + voter avatars + slim progress bars), files (PDFs render inline), contacts, location, and **scheduled messages** (clock-only tick on the author side until pg_cron flips them to "sent" at the scheduled time).
- **Realtime sync**: messages, reactions, pins, edits and deletes propagate over a per-user Postgres-changes channel with `REPLICA IDENTITY FULL` so DELETE events carry full row context.
- **Presence**: online/offline with `last_seen_at` updates on disconnect.
- **Typing**: dedicated Supabase Realtime broadcast channel — instant `typing…` on first keystroke, auto-clears 1.2s after the last keystroke (or instantly on blur / send / chat switch / disconnect via a recipient-side 2.5s heartbeat fallback).
- **Reactions / pin / reply / multi-select / forward**, per-chat shared theme (both participants see the same wallpaper).
- **Delete for me** (per-user soft-hide via `message_hidden_for`) vs **Delete for everyone** (hard DELETE, recipient sees it disappear live).
- **Unread badges** computed from `last_read_at` via a single `get_unread_counts()` RPC.
- Status line shows `typing…` ⇆ `online` ⇆ `last seen at HH:mm`.

### 👻 Ghost Rooms
- Anonymous, ephemeral spaces — Trending / New / My / Joined tabs.
- **PIN-protected** private rooms, share-by-PIN flow, capacity enforcement, auto-expiry.

### 📞 Calls — LiveKit-powered
- **Voice + video** with a real LiveKit Cloud backend (`/api/livekit/token` mints 6-hour access tokens scoped to the room).
- **Ghost call** (no-identity ring), **Schedule** flow that lands as a call-invite bubble in chat.
- Active-call grid with mute / camera / share / hangup, screen-share, recent-calls log (all / missed / dialed / rejected), upcoming list, and a **floating mini-call** dock that follows you around the app.
- Graceful **mock fallback** when LiveKit env vars aren't set — the call UI still renders a placeholder grid so the surface is browsable without provisioning.

### 📸 Stories — Instagram-grade
- **Editor**: Media (background + overlays, camera & upload, stock backgrounds, gradients), Text (full font stack, color + **EyeDropper**, bg, alignment, bold), Stickers / Emoji / GIF / Meme picker, Draw (brush + eyedropper), **Music** (live iTunes search with trending defaults, four sticker variants including a spinning vinyl, 30-second autoplay preview), Filters, and a draggable **layers** panel + one-tap PNG download.
- **Story rings** everywhere — chat list, header, profile panel, sidebar, profile page — with rotating gradient (active) / dim (seen) and a WhatsApp-style **"View story / View profile photo"** prompt.
- **Viewer**: swipes across people, progress bars, 30s music slides, **live animated GIF overlays + spinning music sticker** (kept out of the baked PNG so they truly animate), tap-zone navigation, **like** with flying-heart animation, **reply** (lands as a DM with a small story thumbnail next to the text), your-story **viewers + likers** lists with realtime counts (subscribes to `story_views` + `story_likes` for the visible slide).
- **Persistence**: composed PNG uploaded to a public `chat-attachments` Storage bucket; music + overlay payload stored in `stories.metadata` JSONB.
- **24-hour expiry** via pg_cron (`*/5 * * * *` runs `DELETE FROM stories WHERE expires_at <= NOW()`).
- Upload progress bar in the chat-list header — instant editor close on Share.

### 🧭 Discover & Communities
- Community cards with AI-assisted search, filters (all / joined / trending / mine).
- Create-community flow, community detail view with posts, polls, songs, mentions and reactions.

### 🎨 Whiteboard
- Collaborative canvas with sticky notes, shapes, **arrow connectors** (connect + disconnect), drag-to-arrange, access / share controls.

### 🔒 Vault (Files)
- Encrypted folders, lock / unlock with a vault password, starring, grid / list views, drag-and-drop upload, storage meter, file preview, password-gated delete for locked items.

### 🙋 Profile & ⚙️ Settings
- Profile with banner, story-ringed avatar, stats, bio, links, tabs.
- Settings: Appearance (theme / accent / font / glass intensity / reduce motion / default chat theme), Notifications, Privacy, Security, Devices, Storage, AI, Language.

### ✨ Across the app
- **Command palette** (`⌘ / Ctrl + K`).
- **Obsidian AI assistant** dock (`⌘ / Ctrl + J`) — the in-app AI companion shares the product's name.
- Notification center, global search, route-level skeleton loaders.
- Animated **aurora** theme, glass surfaces, self-hosted `next/font` + bundled **Noto Color Emoji**, global **reduce-motion** toggle.

---

## Architecture

Obsidian connects authentication, real-time messaging, social spaces, collaboration tools, and external services through a unified application shell.

<details>
<summary><strong>Explore the complete system architecture</strong></summary>

```mermaid
flowchart TD

subgraph group_entry["App entry"]
  node_auth["Auth flows<br/>[page.tsx]"]
  node_shell["App shell<br/>[app-shell.tsx]"]
  node_authlistener["Auth listener<br/>[auth-listener.tsx]"]
  node_settings["Profile and settings<br/>[page.tsx]"]
end

subgraph group_messaging["Messaging"]
  node_chatui["Chats and stories<br/>[chat-thread.tsx]"]
end

subgraph group_social["Social spaces"]
  node_communities["Communities<br/>[community-post.tsx]"]
  node_ghost["Ghost rooms<br/>[ghost-chat.tsx]"]
end

subgraph group_collaboration["Calls and tools"]
  node_calls["Calls<br/>[livekit-stage.tsx]"]
  node_callapi["Call APIs<br/>[route.ts]"]
  node_whiteboard["Whiteboard<br/>[board-canvas.tsx]"]
  node_vault["Encrypted vault<br/>[use-vault-store.ts]"]
  node_ai["AI assistant<br/>[ai-assistant.tsx]"]
  node_aichatapi["AI chat API<br/>[route.ts]"]
end

subgraph group_platform["State and services"]
  node_authstate["Auth state<br/>[use-auth-store.ts]"]
  node_chatstate["Chat state<br/>[use-chat-store.ts]"]
  node_callstate["Call state<br/>[use-call-store.ts]"]
  node_settingsstate["Settings state"]
  node_supabaseclient["Supabase client<br/>[client.ts]"]
  node_supabaseserver["Supabase server client<br/>[server.ts]"]
  node_supabase[("Supabase services")]
  node_livekit["LiveKit Cloud"]
  node_klipy["Klipy"]
end

node_user(("User"))

node_user -->|"signs in"| node_auth
node_auth -->|"authenticates"| node_supabaseserver
node_supabaseserver -->|"connects to"| node_supabase
node_authlistener -->|"updates session"| node_authstate
node_user -.->|"uses app"| node_shell
node_shell -.->|"opens conversations"| node_chatui
node_chatui -->|"reads and updates"| node_chatstate
node_chatstate -->|"syncs data"| node_supabaseclient
node_supabaseclient -.->|"realtime and storage"| node_supabase
node_chatui -.->|"loads GIFs"| node_klipy
node_user -.->|"discovers and posts"| node_communities
node_user -.->|"joins rooms"| node_ghost
node_user -.->|"starts or joins"| node_calls
node_calls -->|"tracks sessions"| node_callstate
node_callstate -->|"reads call data"| node_supabaseclient
node_calls -.->|"requests token"| node_callapi
node_callapi -->|"checks session"| node_supabaseserver
node_callapi -.->|"mints access token"| node_livekit
node_user -.->|"collaborates"| node_whiteboard
node_whiteboard -.->|"persists board"| node_supabaseclient
node_user -.->|"manages files"| node_vault
node_vault -->|"stores files"| node_supabaseclient
node_user -.->|"asks assistant"| node_ai
node_ai -.->|"sends prompts"| node_aichatapi
node_aichatapi -.->|"uses backend"| node_supabaseserver
node_user -.->|"configures account"| node_settings
node_settings -->|"updates preferences"| node_settingsstate
node_settingsstate -.->|"persists preferences"| node_supabaseclient

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a

class node_auth,node_shell,node_authlistener,node_settings,node_user toneBlue
class node_chatui toneAmber
class node_communities,node_ghost toneMint
class node_calls,node_callapi,node_whiteboard,node_vault,node_ai,node_aichatapi toneRose
class node_authstate,node_chatstate,node_callstate,node_settingsstate,node_supabaseclient,node_supabaseserver,node_supabase,node_livekit,node_klipy toneIndigo
```

</details>

### Runtime topology

```
┌────────────────────────────────────────────────────────────────────────┐
│  Browser (Next.js 16 App Router, React 19)                             │
│  ┌───────────────┐  ┌──────────────────┐  ┌────────────────┐           │
│  │ Zustand store │  │ Realtime client  │  │ LiveKit client │           │
│  │ chat / story  │◀▶│ presence / msgs  │  │ /components-   │           │
│  │ auth / theme  │  │ typing / stories │  │   react        │           │
│  └───────┬───────┘  └────────┬─────────┘  └────────┬───────┘           │
└──────────┼───────────────────┼─────────────────────┼───────────────────┘
           │                   │                     │
           ▼                   ▼                     ▼
   ┌────────────────────────────────────┐   ┌─────────────────┐
   │  Supabase                          │   │  LiveKit Cloud  │
   │  • Postgres (RLS-secured)          │   │  • SFU          │
   │  • Realtime (postgres_changes +    │   │  • Recording    │
   │    presence + broadcast)           │   └─────────────────┘
   │  • Storage (chat-attachments)      │            ▲
   │  • pg_cron (scheduled msgs,        │            │
   │    24h story expiry)               │   ┌────────┴────────┐
   │  • Auth (email / OAuth)            │   │ /api/livekit/   │
   └────────────────────────────────────┘   │ token (server)  │
                                            └─────────────────┘
```

Key design choices:

- **Optimistic UI + `client_id` dedupe.** Sends append to local state instantly; the realtime echo replaces the temp row by `client_id` so there's never a flash of duplication.
- **Typing on broadcast, not presence.** Presence's `sync` event was unreliable for transient "stopped typing" updates. The dedicated broadcast channel + 2.5s auto-clear heartbeat is bulletproof.
- **REPLICA IDENTITY FULL on `messages`, `chats`, `chat_members`, `stories`** so realtime DELETE events carry enough context to route on the recipient side.
- **One-shot SQL bundle** (`supabase/APPLY_PENDING.sql`) — every section is `IF NOT EXISTS` / `OR REPLACE` / `ON CONFLICT`, so applying twice is a no-op.

---

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 3.4, custom design tokens & glass utilities, `next-themes`
- **Motion**: Framer Motion 11
- **UI primitives**: Radix UI wrapped shadcn-style, `cmdk`, `lucide-react`
- **State & data**: Zustand (11+ stores), TanStack Query
- **Forms**: React Hook Form + Zod
- **Backend**: Supabase (Postgres 15 + Realtime + Storage + pg_cron + RLS)
- **Calls**: LiveKit Cloud + `livekit-server-sdk` + `@livekit/components-react`
- **External APIs**: Klipy (GIFs / stickers / memes), iTunes Search (music previews), browser **EyeDropper** API

---

## Docker quick start

The prebuilt image is the fastest way to run Obsidian. It includes the optimized Next.js standalone server and does not require Node.js or npm on the host.

**Image:** [`code2withpratik/obsidian-safe-and-secure:latest`](https://hub.docker.com/r/code2withpratik/obsidian-safe-and-secure)

<p align="center">
  <img alt="Step 1: Install" src="https://img.shields.io/badge/1-Install-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <strong>→</strong>
  <img alt="Step 2: Pull" src="https://img.shields.io/badge/2-Pull-6F42C1?style=flat-square&logo=docker&logoColor=white" />
  <strong>→</strong>
  <img alt="Step 3: Configure" src="https://img.shields.io/badge/3-Configure-F59E0B?style=flat-square&logo=dotenv&logoColor=white" />
  <strong>→</strong>
  <img alt="Step 4: Launch" src="https://img.shields.io/badge/4-Launch-16A34A?style=flat-square&logo=rocket&logoColor=white" />
  <strong>→</strong>
  <img alt="Step 5: Verify" src="https://img.shields.io/badge/5-Verify-0891B2?style=flat-square&logo=statuspage&logoColor=white" />
</p>

> [!TIP]
> **Recommended path:** Pull the published image for the quickest setup. Build from source only when you need to replace the public Supabase, LiveKit, or site configuration embedded in the browser bundle.

### 1. Install Docker 🐳

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) on Windows or macOS, or Docker Engine on Linux. Confirm that it is running:

```bash
docker --version
```

### 2. Pull the image 📦

```bash
docker pull code2withpratik/obsidian-safe-and-secure:latest
```

### 3. Configure the environment ⚙️

Create a `.env.local` file and add the credentials for the services you use. Start from [.env.example](.env.example) when the repository is available:

```bash
# Supabase — required for authentication and persisted application data
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<server-side-secret-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# LiveKit — optional; required for real voice and video calls
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=<api-key>
LIVEKIT_API_SECRET=<api-secret>
NEXT_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud

# Optional integrations
KLIPY_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_AI_MODEL=gemini-2.5-flash-lite
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5
```

> [!IMPORTANT]
> Variables prefixed with `NEXT_PUBLIC_` are browser-visible and are embedded into the application at build time. They must contain only public service configuration.

> [!WARNING]
> Never commit `.env.local` or expose server-side keys. Keep `SUPABASE_SECRET_KEY`, `LIVEKIT_API_SECRET`, `GEMINI_API_KEY`, and `ELEVENLABS_API_KEY` private.

### 4. Start the container 🚀

The following command works in PowerShell, Command Prompt, Bash, and other standard shells:

```bash
docker run -d --name obsidian --restart unless-stopped --env-file .env.local -p 3000:3000 code2withpratik/obsidian-safe-and-secure:latest
```

### 5. Verify the deployment ✅

Open <http://localhost:3000>, then confirm that the container is healthy:

```bash
docker ps --filter "name=obsidian"
docker logs -f obsidian
```

> [!TIP]
> If the page is not available immediately, follow the logs for startup or environment errors with `docker logs -f obsidian`.

<details>
<summary><strong>Container lifecycle commands</strong></summary>

Use these commands to manage the existing container without recreating it:

```bash
docker stop obsidian
docker start obsidian
```

</details>

<details>
<summary><strong>Advanced: use your own public service configuration</strong></summary>

Next.js embeds `NEXT_PUBLIC_*` variables into the browser bundle at image-build time. The published image therefore uses the public configuration with which it was released. To connect the client to a different Supabase, LiveKit, or public site URL, clone the repository and build your own image:

```bash
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co" --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<publishable-key>" --build-arg NEXT_PUBLIC_SITE_URL="https://<your-domain>" --build-arg NEXT_PUBLIC_LIVEKIT_URL="wss://<project>.livekit.cloud" -t obsidian:local .
docker run -d --name obsidian --restart unless-stopped --env-file .env.local -p 3000:3000 obsidian:local
```

Only pass public values as build arguments. Keep `SUPABASE_SECRET_KEY`, `LIVEKIT_API_SECRET`, `GEMINI_API_KEY`, and other private credentials in the runtime environment file.

</details>

---

## Getting started from source

```bash
git clone https://github.com/Code2With-Pratik/Obsidian-safe-and-secure.git
cd Obsidian-safe-and-secure
npm ci
cp .env.example .env.local
# Fill in Supabase + LiveKit values (see Environment variables below)
npm run dev
```

Open <http://localhost:3000>. You'll land on the animated splash — continue through onboarding / sign in to reach the chat surface.

> [!IMPORTANT]
> Before any data flows, apply the SQL bundle described in [Supabase setup](#supabase-setup).

---

## Supabase setup

1. Create a project at <https://supabase.com/dashboard>.
2. Copy the project URL + the `anon` (publishable) key into [.env.local](.env.example) (see [Environment variables](#environment-variables)).
3. Open the SQL editor at `https://supabase.com/dashboard/project/<your-ref>/sql/new`.
4. Open [supabase/APPLY_PENDING.sql](supabase/APPLY_PENDING.sql), copy the entire file, paste it in, and click **Run**.

That single script creates / migrates everything the app needs:

| Section | What it does |
| ---: | --- |
| 1 | `chat_members` prefs (pinned/muted/favorite), `messages.client_id` for optimistic dedupe, realtime publication + `REPLICA IDENTITY FULL` for `message_reactions`, `chats`, `chat_members` |
| 2 | `blocked_users` table + RLS |
| 3 | `get_unread_counts()` RPC |
| 4 | Shared per-chat `theme` + `custom_bg` on `chats` |
| 5 | `message_hidden_for` (Delete for me) + `messages.schedule_at` + pg_cron `deliver-scheduled-messages` |
| 6 | `profiles.last_seen_at` |
| 7 | DELETE policy on messages (so Delete-for-everyone actually works) + `REPLICA IDENTITY FULL` on messages |
| 8 | Public `chat-attachments` Storage bucket + read/upload/update/delete policies |
| 9 | Merge duplicate DM chats (legacy data cleanup) |
| 10 | `story_likes` + `stories.metadata` JSONB + realtime publication + pg_cron `cleanup-expired-stories` |

The script is **idempotent** — re-run it any time you pull schema changes; nothing is destructive.

### Auth setup (optional)

- Email/password auth works out of the box.
- For Google / GitHub / Apple login, enable the providers in **Authentication → Providers** in the Supabase dashboard and add the OAuth credentials.

---

## LiveKit setup

1. Create a free project at <https://cloud.livekit.io>.
2. Generate API key + secret from the project settings.
3. Add to `.env.local`:
   ```bash
   LIVEKIT_URL=wss://<your-project>.livekit.cloud
   LIVEKIT_API_KEY=APIxxxxxxxxxx
   LIVEKIT_API_SECRET=secretxxxxxxxxxx
   NEXT_PUBLIC_LIVEKIT_URL=wss://<your-project>.livekit.cloud
   ```

> [!NOTE]
> If `NEXT_PUBLIC_LIVEKIT_URL` is unset, the call surface falls back to a mock grid so the rest of the app remains browsable.

---

## Environment variables

Copy `.env.example` to `.env.local` and configure the services you want to enable:

| Variable | Required | Visibility | Purpose |
| --- | :---: | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | Supabase project URL used by browser and server clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Public | Supabase publishable key used for authenticated client access |
| `SUPABASE_SECRET_KEY` | For full auth flows | Server only | Supabase Admin API access, including pre-confirmed signup |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | Public | Canonical application URL for authentication redirects |
| `KLIPY_API_KEY` | No | Server only | GIF, sticker, and meme search |
| `LIVEKIT_URL` | No | Server only | LiveKit WebSocket endpoint used when issuing call tokens |
| `LIVEKIT_API_KEY` | No | Server only | LiveKit server API key |
| `LIVEKIT_API_SECRET` | No | Server only | LiveKit server API secret |
| `NEXT_PUBLIC_LIVEKIT_URL` | No | Public | LiveKit endpoint used by the browser call client |
| `GEMINI_API_KEY` | No | Server only | AI assistant provider key |
| `NEXT_PUBLIC_AI_MODEL` | No | Public | Gemini model name; defaults to `gemini-2.5-flash-lite` |
| `ELEVENLABS_API_KEY` | No | Server only | Voice-response text-to-speech key |
| `ELEVENLABS_VOICE_ID` | No | Server only | ElevenLabs voice identifier |
| `ELEVENLABS_MODEL_ID` | No | Server only | ElevenLabs model identifier |

> [!WARNING]
> **Security:** Never commit real secrets. `.env.local` is gitignored, while `.env.example` contains placeholders only. Variables marked public are included in browser-delivered code and must never contain privileged credentials.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server with HMR |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## Project structure

```
app/
  (auth)/                splash, login, register, username, 2fa
  (app)/                 chats/, ghost-rooms/, calls/, discover/, stories/,
                         whiteboard/, files/ (vault), profile/, settings/
                         layout.tsx (AppShell)  ·  loading.tsx skeletons per route
  api/livekit/token/     server route — mints LiveKit access tokens
  layout.tsx             root layout, metadata + OG image, providers
  fonts.tsx              self-hosted next/font families (+ Noto Color Emoji)
  globals.css            design tokens, glass utilities, animations
components/
  ui/                    shadcn-style primitives
  layout/                Sidebar, Topbar, MobileNav, FloatingMiniCall
  stories/               StoryAvatar, StoryLayer (viewer), VinylDisc
  calls/                 LiveKitStage
  brand/, notifications/, auth-listener.tsx
  command-palette.tsx, ai-assistant.tsx
features/
  chat/                  message-input, chat-bubble, chat-header,
                         attachment-dialogs, delete-message-dialog,
                         chat-members-card, expressions-picker, …
  stories/               story-editor (2.8k-line canvas editor)
  calls/                 livekit-stage, call-controls, …
  ghost/, community/, whiteboard/, vault/, profile/
hooks/                   use-hotkeys, use-media-query
lib/
  i18n.ts                9-language strings
  supabase/              client.ts, server.ts, actions.ts
  klipy.ts, mock-data.ts, utils.ts
providers/               app-providers, theme-provider, query-provider
store/                   12 Zustand stores:
  use-auth-store         current user + session
  use-chat-store         chats / messages / typing / presence / blocked
  use-stories-store      stories + views + likes (full Supabase)
  use-chat-theme-store   per-chat shared theme
  use-ui-store           command palette, AI dock, calls UI
  use-settings-store, use-notification-store, use-vault-store,
  use-community-store, use-tabs-store,
  use-message-selection-store, use-search-store
supabase/
  APPLY_PENDING.sql      ★ paste-and-run bundle (10 sections)
  migrations/            individual migration files (history)
types/                   shared TypeScript types
public/                  og-default.jpg, Background*.jpg, Favicon.ico
```

---

## Realtime channels

Obsidian runs five Supabase Realtime channels in parallel:

| Channel | Type | What it carries |
| --- | --- | --- |
| `nova_presence_v1` | presence | who's online (keyed by `user.id` so multi-tab maps to one entry) |
| `nova_typing_v1` | broadcast | `{user_id, chat_id, typing}` — heartbeated every keystroke, 2.5s auto-clear |
| `nova_msgs_<userId>` | postgres_changes | INSERT/UPDATE/DELETE on `messages` (scheduled-message gating included) |
| `nova_reactions_<userId>` | postgres_changes | INSERT/DELETE on `message_reactions` → rebuilds aggregated counts |
| `nova_chats_<userId>` | postgres_changes | DELETE on `chats` + UPDATE for shared per-chat theme |
| `nova_stories_<userId>` | postgres_changes | INSERT/DELETE on `stories` |
| `story_stats_<storyId>` | postgres_changes | scoped to the visible story slide — live `story_views` + `story_likes` updates for the author's footer |

Defensive cleanup sweeps stale channels by topic on init, so HMR / double-mounts can't trip the "callbacks after subscribe()" error.

---

## Internationalization

A lightweight in-house i18n (`lib/i18n.ts`) covers **9 languages** — English, Hindi, Marathi, Arabic, Russian, Turkish, Portuguese, Chinese and Japanese — with full **RTL** layout support for Arabic. English strings double as the lookup keys, so untranslated strings gracefully fall back to English.

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘ / Ctrl + K` | Open the command palette |
| `⌘ / Ctrl + J` | Toggle the Obsidian AI assistant |
| `Esc` | Close the current overlay |
| `Enter` (in input) | Send message |
| `Shift + Enter` (in input) | New line |
| `Space` (empty input) | Open the AI inline composer |

---

## Notes & caveats

- **Data is live on Supabase.** Sign-in is required; refreshing preserves state because everything is persisted server-side and re-hydrated on `SIGNED_IN`.
- **Music previews** come from the public **iTunes Search API**; **GIFs / stickers / memes** from **Klipy** — both degrade to empty states when the upstream is unavailable.
- **The EyeDropper color picker** and some Web Animation APIs are Chromium-first; unsupported features degrade gracefully.
- A persistent **`cursorshover="true"` hydration warning** in the console is caused by custom-cursor browser extensions injecting attributes before React hydrates — disable the extension or use Incognito to silence it. The app itself is unaffected.
- **The in-app AI assistant is also called Obsidian** — the brand voice and the assistant share the name; both refer to the same product personality.

---

<p align="center"><sub>Built with Next.js 16, React 19, Supabase and LiveKit. Design assets live in <code>/public</code>.</sub></p>
