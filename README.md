# Nova · The Future Operating System for Communication

A premium, futuristic communication platform frontend built with **Next.js 15**, **React**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Shadcn UI**, **Zustand**, **TanStack Query**, and **Lucide Icons**.

> Think Telegram × Discord × Instagram × Linear × Arc × VisionOS × Notion × Slack — distilled into a single luminous OS for messages, calls, ghost rooms, stories, files, browsers and whiteboards.

---

## Highlights

- **Glassmorphism + cyberpunk elegance** with an animated aurora theme engine, dark / light / system themes, and configurable accent colors.
- **Framer Motion everywhere** — page transitions, sidebar reflows, floating mini-call, animated reactions, story progress, drag-and-drop sticky notes.
- **15+ flagship screens** including a full chat experience, ghost rooms, an active video meeting, an in-app browser with tabs, a collaborative whiteboard, story viewer, profile, files vault, discover, settings.
- **Production patterns**: feature-based folder structure, Zustand stores, TanStack Query, React Hook Form + Zod schemas, Radix primitives wrapped Shadcn-style, command palette with global hotkeys (⌘K), AI assistant dock (⌘J).
- **Realtime-ready** with Socket.io / WebRTC placeholders in `services/api.ts`.

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll land on the animated splash screen — click "Enter Nova" to walk through onboarding, or sign in to land on the chat surface.

## Project structure

```
app/
  (auth)/        splash, onboarding, login, register, username, 2fa, recover
  (app)/         chats/, ghost-rooms/, calls/, browser/, whiteboard/,
                  stories/, files/, settings/, discover/, profile/
  layout.tsx    root layout, fonts, theme + query providers
  globals.css   design tokens + glass utilities + animations
components/
  ui/           shadcn-style primitives (Button, Card, Avatar, Switch, …)
  layout/       Sidebar, Topbar, MobileNav, FloatingMiniCall
  brand/        NovaLogo (animated)
  command-palette.tsx, ai-assistant.tsx
features/
  chat/         ChatList, ChatBubble, MessageInput, ChatHeader,
                ChatThread, ChatDetailsPanel, ReactionPicker, StoriesRail
  ghost/        GhostRoomCard, CreateGhostDialog
  calls/        VideoGrid, CallControls
hooks/          use-hotkeys, use-media-query
lib/            utils, mock-data
providers/      ThemeProvider, QueryProvider, AppProviders
services/       api.ts (mock + realtime placeholders)
store/          use-auth-store, use-ui-store, use-chat-store
types/          shared TS types
```

## Design tokens

CSS variables drive both themes — defined in `app/globals.css`. Tailwind maps them in `tailwind.config.ts` (`primary`, `accent`, `card`, `popover`, etc.). Key utilities:

- `.glass`, `.glass-strong`, `.glass-subtle` — backdrop-filter surfaces
- `.aurora-bg` — animated multi-stop radial gradients
- `.neon-text` — gradient text fill
- `.grid-fade` — masked grid backdrop
- `.shimmer` — skeleton animation

Accent colors and glass intensity are user-configurable in **Settings → Appearance**.

## Hotkeys

| Combo | Action |
| --- | --- |
| `⌘K` | Open command palette |
| `⌘J` | Toggle Nova AI assistant |
| `Esc` | Close command palette / modal |

## Realtime hookup

`services/api.ts` exports `socketPlaceholder` and `webrtcPlaceholder` — drop your real `socket.io-client` + `RTCPeerConnection` setup in there to bring chat and calls online. The chat store (`store/use-chat-store.ts`) already handles optimistic sends with `sending → delivered` status transitions you can wire to socket acks.

## What's mocked

- All data lives in `lib/mock-data.ts` (chats, messages, ghost rooms, stories, communities, files, call participants).
- The `api` object in `services/api.ts` returns the mocks with artificial latency so TanStack Query works realistically.
- Voice waveforms, call timer, typing indicator, live cursors on the whiteboard, story progress bars, and AI replies are all simulated client-side.

Swap any of these for real APIs without touching component code.

## Built with

- [Next.js 15 App Router](https://nextjs.org/docs)
- [React 19 RC](https://react.dev)
- [TypeScript](https://typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) + [`tailwindcss-animate`](https://github.com/jamiebuilds/tailwindcss-animate)
- [Framer Motion](https://framer.com/motion)
- [Shadcn UI](https://ui.shadcn.com) patterns on [Radix UI](https://radix-ui.com) primitives
- [Zustand](https://zustand-demo.pmnd.rs) for state
- [TanStack Query](https://tanstack.com/query) for data
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) for forms
- [Lucide Icons](https://lucide.dev)
- [cmdk](https://cmdk.paco.me) for the command palette

---

Built to feel like _the future operating system for communication._
