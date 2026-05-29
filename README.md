<p align="center">
  <img src="public/og-default.jpg" alt="Obsidian — The Future of Communication" width="100%" />
</p>

<h1 align="center">Obsidian</h1>

<p align="center">
  <strong>The Future of Communication.</strong><br/>
  A futuristic communication OS — chats, ghost rooms, calls, communities, stories, a whiteboard and an encrypted vault, all in one luminous, glassmorphic interface.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss" />
  <img alt="Framer Motion" src="https://img.shields.io/badge/Framer_Motion-11-FF2BC2?logo=framer" />
</p>

> Think Telegram × Discord × Instagram × WhatsApp × Linear × Arc — distilled into a single secure, animated OS for messages, calls, ghost rooms, stories, files and whiteboards.

---

## Overview

Obsidian is a premium, production-styled frontend built on **Next.js 15 (App Router)** and **React 19**. Every surface is fully realized with mock data and in-memory stores, so the whole product is clickable end-to-end without a backend. It ships with a theme engine (dark / light / system + accent colors + glass intensity), 9-language internationalization with RTL support, a command palette, an AI assistant dock, route-level skeleton loaders, and motion polish throughout.

## Features

### 💬 Chats
- DMs, group chats, channels, and **secret chats**.
- Rich messages: text, **voice notes** (with live waveform), **images & GIFs**, stickers, **polls**, contacts, location, files, link previews, and scheduled / call-invite cards.
- Reactions, replies, pinned messages, multi-select, and per-chat themes.
- Conversation details panel (shared media / files / links, mute, disappearing messages, pinned).
- A **stories rail** at the top and a tabbed **emoji · GIF · stickers · memes** picker (Klipy-powered) with search.

### 👻 Ghost Rooms
- Anonymous, ephemeral spaces with no identities.
- Trending / New / My rooms / Joined, **PIN-protected** private rooms, and create-room / join / share-by-PIN flows.

### 📞 Calls & meetings
- Voice & video, **Ghost call** (ring with no identity), and **Schedule** flows.
- Active-call grid with controls, recent calls (all / missed / dialed / rejected), an upcoming list, and a **floating mini-call** dock.

### 🧭 Discover & Communities
- Community cards with AI search, filters (all / joined / trending / mine), create-community, and a community detail view with posts and polls.

### 📸 Stories (Instagram / WhatsApp-style)
- **Editor** with Media (background / overlay, camera & upload, stock images, gradients), Text (all appearance fonts, colors, **eyedropper** color picker, backgrounds, alignment), Stickers / Emoji / GIF / Meme, Draw (brush + eyedropper), **Music** (live iTunes search with trending defaults and a spinning **vinyl** variant + autoplay preview), and Filters — plus a draggable **layers** panel and PNG download.
- **Story rings** everywhere (chat list, header, details, sidebar, profile) with a rotating gradient, a WhatsApp-style "story / profile photo" prompt, and an enlarged photo viewer.
- **Viewer**: swipe across people, progress bars, 30s duration for music slides, **animated GIF & music overlays**, play / pause, **like** (heart animation) and **reply** (delivered into the person's chat with the story image), your-story **viewers & likers** list, and **24-hour expiry**.
- An upload progress bar in the chat-list header (instant editor close on Share).

### 🎨 Whiteboard
- Collaborative canvas with sticky notes, shapes, and arrow connectors (connect & disconnect), drag-to-arrange, and access / share controls.

### 🔒 Vault (Files)
- Encrypted folders, lock / unlock with a vault password, starring, grid / list views, drag-and-drop upload, a storage meter, file preview, and confirm-to-delete (password-gated for locked items).

### 🙋 Profile & ⚙️ Settings
- Profile with banner, story-ringed avatar, stats, bio, links and tabs.
- Settings: Appearance (theme, accent, font, glass intensity, reduce motion, default chat theme), Notifications, Privacy, Security, Devices, Storage, AI, and Language.

### ✨ Across the app
- **Command palette** (`⌘/Ctrl + K`) and **AI assistant** dock (`⌘/Ctrl + J`).
- Notification center, global search, and **YouTube-style skeleton loaders** on every route.
- Animated **aurora** theme, glass surfaces, self-hosted fonts (`next/font`) + bundled **Noto Color Emoji**, and a global **reduce-motion** setting.

## Tech stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, custom design tokens & glass utilities, `next-themes`
- **Motion:** Framer Motion
- **UI primitives:** Radix UI wrapped shadcn-style, `cmdk`, `lucide-react`
- **State & data:** Zustand (in-memory stores), TanStack Query
- **Forms:** React Hook Form + Zod
- **External APIs:** Klipy (GIFs / stickers / memes), iTunes Search (music previews), the browser **EyeDropper** API

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll land on the animated splash — continue through onboarding / sign in to reach the chat surface.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Project structure

```
app/
  (auth)/            splash, login, register, username, 2fa
  (app)/             chats/, ghost-rooms/, calls/, discover/, stories/,
                     whiteboard/, files/ (vault), profile/, settings/
                     layout.tsx (AppShell)  ·  loading.tsx skeletons per route
  layout.tsx         root layout, metadata + OG image, providers
  fonts.tsx          self-hosted next/font families (+ Noto Color Emoji)
  globals.css        design tokens, glass utilities, animations
components/
  ui/                shadcn-style primitives (Button, Avatar, Skeleton, …)
  layout/            Sidebar, Topbar, MobileNav, FloatingMiniCall
  stories/           StoryAvatar, StoryLayer (viewer), VinylDisc
  brand/, notifications/
  command-palette.tsx, ai-assistant.tsx, nova-mascot.tsx, settings-effects.tsx
features/
  chat/  ghost/  calls/  community/  stories/  whiteboard/  vault/  profile/
hooks/               use-hotkeys, use-media-query
lib/                 i18n (9 languages), klipy, mock-data, utils
providers/           app-providers, theme-provider, query-provider
services/            api.ts (mock + realtime placeholders)
store/               11 Zustand stores (auth, chat, stories, settings, vault, …)
types/               shared TypeScript types
public/              og-default.jpg (banner), Background*.jpg, Favicon.ico
```

## Internationalization

A lightweight in-house i18n (`lib/i18n.ts`) covers **9 languages** — English, Hindi, Marathi, Arabic, Russian, Turkish, Portuguese, Chinese and Japanese — with full **RTL** layout support for Arabic. English strings double as the lookup keys, so untranslated strings gracefully fall back to English.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘ / Ctrl + K` | Open the command palette |
| `⌘ / Ctrl + J` | Toggle the AI assistant |
| `Esc` | Close the current overlay |

## Notes

- All data is **mock / in-memory** (Zustand). Refreshing resets state; there is no backend.
- Music previews come from the public **iTunes Search API**; GIFs / stickers / memes from **Klipy** (these degrade to empty states when unavailable).
- The **EyeDropper** color picker and some animations are Chromium-first; unsupported features degrade gracefully.

---

<p align="center"><sub>Built with Next.js, Tailwind and Framer Motion. Design assets live in <code>/public</code>.</sub></p>
