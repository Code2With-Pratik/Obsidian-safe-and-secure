"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Ghost,
  Lock,
  ChevronLeft,
  PinIcon,
  Pin,
  BellOff,
  Bell,
  Palette,
  CalendarClock,
  Eraser,
  Trash2,
  Ban,
  Flag,
  Download,
  Star,
  Users,
  Sparkles,
  Copy as CopyIcon,
  Forward as ForwardIcon,
  X as XIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedAvatar } from "@/components/animated-avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/use-ui-store";
import { useChatStore } from "@/store/use-chat-store";
import { useCallStore } from "@/store/use-call-store";
import { useStoriesStore } from "@/store/use-stories-store";
import { useImageLightbox } from "@/features/chat/image-lightbox";
import { StoryAvatar } from "@/components/stories/story-avatar";
import { users as allUsers } from "@/lib/mock-data";
import { formatLastSeen } from "@/lib/utils";
import { useChatThemeStore } from "@/store/use-chat-theme-store";
import { useMessageSelectionStore } from "@/store/use-message-selection-store";
import { useAuthStore } from "@/store/use-auth-store";
import { copyText } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { ChatThemeDialog } from "./chat-theme-dialog";
import { DeleteMessageDialog } from "./delete-message-dialog";
import { ScheduleMessageDialog } from "./attachment-dialogs";

/** Stable empty array used as the fallback for `selected[chat.id]` so the
 *  Zustand selector doesn't return a fresh `[]` on every render (which
 *  trips React's "getSnapshot should be cached" / max-update-depth loop). */
const EMPTY_SELECTED_IDS: string[] = [];
import type { Chat } from "@/types";

export function ChatHeader({
  chat,
  search,
  onSearchChange,
  onCloseSearch
}: {
  chat: Chat;
  /** When non-null the header shows the search input instead of the title. */
  search?: string | null;
  onSearchChange?: (value: string) => void;
  onCloseSearch?: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const me = useAuthStore((s) => s.user);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const typingMap = useChatStore((s) => s.typing);
  const isTyping = (typingMap[chat.id]?.length ?? 0) > 0;
  
  // DM chats: check if the other member is online
  const otherMemberId = chat.memberIds?.find(id => id !== me?.id);
  const isOnline = chat.type === 'dm' 
    ? (otherMemberId && onlineUsers.includes(otherMemberId)) 
    : !!chat.online;

  const startCallStore = useUIStore((s) => s.startCall);
  const startCallSession = useCallStore((s) => s.start);
  const removeChat = useChatStore((s) => s.removeChat);
  const pinChat = useChatStore((s) => s.pinChat);
  const muteChat = useChatStore((s) => s.muteChat);
  const favouriteChat = useChatStore((s) => s.favouriteChat);
  const clearChat = useChatStore((s) => s.clearChat);
  const blockUser = useChatStore((s) => s.blockUser);
  const messages = useChatStore((s) => s.messages);

  const themeId = useChatThemeStore((s) => s.byChat[chat.id] ?? "default");
  const selectionCount = useMessageSelectionStore(
    (s) => s.selected[chat.id]?.length ?? 0
  );
  const clearSelection = useMessageSelectionStore((s) => s.clear);
  const removeMessages = useChatStore((s) => s.removeMessages);
  const selectionActive = selectionCount > 0;
  const rightPanel = useUIStore((s) => s.rightPanel);
  const setRightPanel = useUIStore((s) => s.setRightPanel);
  // Clicking the header NAME (or "View profile") toggles the docked
  // details panel — the single profile surface. The old full-screen overlay
  // sheet has been removed to avoid two competing profile UIs.
  const openProfile = () => setRightPanel(rightPanel === "details" ? null : "details");

  // Clicking the AVATAR specifically is treated as "view photo / story" —
  // distinct from clicking the name (which opens the details panel).
  // DM → "Profile or Story?" prompt (story-layer's Prompt component).
  // Group → straight to the shared lightbox; no story concept for groups.
  const openPrompt = useStoriesStore((s) => s.openPrompt);
  const lightbox = useImageLightbox();
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [deleteChatOpen, setDeleteChatOpen] = React.useState(false);
  const [clearChatOpen, setClearChatOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const sendAttachment = useChatStore((s) => s.sendAttachment);
  const profileCache = useChatStore((s) => s.profiles);

  // DM → resolve the single user to show their story ring on the header avatar.
  const storyUserId = chat.type === "dm" ? otherMemberId : undefined;
  const hasStory = useStoriesStore((s) =>
    storyUserId ? !!s.byUser[storyUserId]?.slides.length : false
  );

  const startCall = async (video: boolean) => {
    // Group / channel / ghost-room chats start a multi-party call; a DM is 1-on-1.
    const isGroup = chat.type !== "dm" && chat.type !== "secret";
    // Persist the call_session + ring the invitees BEFORE navigating so the
    // recipient's IncomingCallModal can appear at the same moment the
    // caller's active-call screen does. Failures fall back to the legacy
    // local-only flow so unconfigured deployments still work.
    void startCallSession({
      chatId: chat.id,
      video,
      isGroup
    });
    startCallStore({
      chatId: chat.id,
      name: chat.name,
      avatar: chat.avatar,
      video,
      group: isGroup,
      participants: isGroup
        ? Math.max(2, chat.memberIds?.length ?? chat.membersCount ?? 4)
        : 2,
      // Send the user back to this exact chat when they hang up.
      returnTo: `/chats/${chat.id}`
    });
    router.push("/calls/active");
  };

  const copySelected = () => {
    const ids = new Set(useMessageSelectionStore.getState().selected[chat.id] ?? []);
    const messages = useChatStore.getState().messages[chat.id] ?? [];
    const text = messages
      .filter((m) => ids.has(m.id))
      .map((m) => m.content ?? "")
      .filter(Boolean)
      .join("\n");
    if (text) void copyText(text);
    clearSelection(chat.id);
  };

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const hideMessages = useChatStore((s) => s.hideMessages);
  // Multi-select Delete now opens the shared dialog — Delete for everyone is
  // only offered when every selected message is mine.
  const deleteSelected = () => {
    setDeleteOpen(true);
  };
  // Important: select the raw value, then fall back to a STABLE empty array
  // outside the selector. A `?? []` inside the selector returns a fresh `[]`
  // every render and trips React's
  // "result of getSnapshot should be cached to avoid an infinite loop".
  const selectedIdsRaw = useMessageSelectionStore((s) => s.selected[chat.id]);
  const selectedIds = selectedIdsRaw ?? EMPTY_SELECTED_IDS;
  const allSelectedAreMine = React.useMemo(() => {
    if (!me?.id || selectedIds.length === 0) return false;
    const list = messages[chat.id] ?? [];
    return selectedIds.every((id) => list.find((m) => m.id === id)?.authorId === me.id);
  }, [selectedIds, messages, chat.id, me?.id]);

  if (selectionActive) {
    return (
      <>
        <div className="relative z-10 flex items-center gap-2 px-3 md:px-5 h-16 border-b border-border/40 backdrop-blur-2xl backdrop-saturate-180 bg-card/70 dark:bg-card/65 glass-specular shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => clearSelection(chat.id)}
            aria-label="Exit selection mode"
            className="[&_svg]:size-6 dark:text-white dark:hover:text-white"
          >
            <XIcon />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] truncate">
              {selectionCount} {t("selected")}
            </p>
            <p className="text-[11px] text-muted-foreground">{t("Tap messages to add or remove")}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={copySelected}
              aria-label="Copy selected"
              title="Copy"
              className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
            >
              <CopyIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Forward selected"
              title="Forward"
              onClick={() => clearSelection(chat.id)}
              className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
            >
              <ForwardIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={deleteSelected}
              aria-label="Delete selected"
              title="Delete"
              className="[&_svg]:size-[22px] text-rose-400 hover:text-rose-300"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        <DeleteMessageDialog
          open={deleteOpen}
          count={selectedIds.length}
          canDeleteForEveryone={allSelectedAreMine}
          onClose={() => setDeleteOpen(false)}
          onDeleteForMe={async () => {
            await hideMessages(chat.id, selectedIds);
            clearSelection(chat.id);
            setDeleteOpen(false);
          }}
          onDeleteForEveryone={async () => {
            await removeMessages(chat.id, selectedIds);
            clearSelection(chat.id);
            setDeleteOpen(false);
          }}
        />
      </>
    );
  }

  const searchActive = search != null;

  return (
    <div className="relative z-10 flex items-center gap-3 px-3 md:px-5 h-16 border-b border-border/40 backdrop-blur-2xl backdrop-saturate-180 bg-card/70 dark:bg-card/65 glass-specular shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)]">
      {searchActive ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCloseSearch?.()}
            aria-label="Close search"
            className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
          >
            <ChevronLeft />
          </Button>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              value={search ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCloseSearch?.();
              }}
              placeholder={`${t("Search in chat")} · ${chat.name}…`}
              className="w-full h-10 pl-9 pr-9 rounded-full glass-subtle border border-border/60 bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60 placeholder:text-muted-foreground/70"
            />
            {search && search.length > 0 && (
              <button
                onClick={() => onSearchChange?.("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-full grid place-items-center hover:bg-foreground/10"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <Link href="/chats" className="md:hidden">
            <Button variant="ghost" size="icon" className="[&_svg]:size-7 dark:text-white dark:hover:text-white">
              <ChevronLeft />
            </Button>
          </Link>

          <div className="flex items-center gap-3 flex-1 min-w-0 -ml-2 pl-2 py-1.5">
            {/* Avatar is its OWN button now (was bundled with the name).
                Click the AVATAR → "Profile / Story" prompt for DMs, or
                straight-to-lightbox for groups. Click the NAME → toggle
                the docked details panel as before. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (chat.type === "dm" && storyUserId) {
                  openPrompt(storyUserId);
                } else if (chat.type !== "dm" && chat.avatar) {
                  lightbox.open([{ src: chat.avatar, alt: chat.name }], 0);
                } else {
                  // Fallback for DMs without a resolvable partner id —
                  // just open the details panel.
                  openProfile();
                }
              }}
              aria-label={chat.type === "dm" ? t("View profile or story") : t("View group photo")}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            >
              {hasStory && storyUserId ? (
                <StoryAvatar userId={storyUserId} src={chat.avatar} name={chat.name} size={40} />
              ) : (
                <AnimatedAvatar
                  src={chat.avatar}
                  name={chat.name}
                  size={40}
                  status={isOnline ? "online" : "offline"}
                  pulse={false}
                  breathe={false}
                  ring={false}
                  hoverLift={false}
                />
              )}
            </button>
            <button
              onClick={openProfile}
              className="flex items-center gap-3 flex-1 min-w-0 hover:bg-foreground/[0.03] rounded-xl py-1 transition group"
            >
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{chat.name}</span>
                  {chat.encrypted && <Lock className="size-3.5 text-emerald-400" />}
                  {chat.type === "ghost" && (
                    <Badge variant="glass" className="!text-[10px]">
                      <Ghost className="size-2.5" /> ghost
                    </Badge>
                  )}
                </div>
                <div className={`text-[11px] truncate ${isTyping ? "text-cyan-400" : "text-muted-foreground"}`}>
                  {chat.type === "group" || chat.type === "channel"
                    ? isTyping
                      ? t("typing…")
                      : `${chat.membersCount} ${t("members")}`
                    : isTyping
                    ? t("typing…")
                    : isOnline
                    ? t("online")
                    : chat.lastSeenAt
                    ? `${t("last seen")} ${formatLastSeen(new Date(chat.lastSeenAt))}`
                    : t("last seen recently")}
                </div>
              </div>
            </button>
          </div>
        </>
      )}

      <div className={`flex items-center gap-1 ${searchActive ? "hidden" : ""}`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startCall(false)}
          title={t("Voice call")}
          className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
        >
          <Phone />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startCall(true)}
          title={t("Video call")}
          className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
        >
          <Video />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSearchChange?.("")}
          title={t("Search in chat")}
          aria-label={t("Search in chat")}
          className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
        >
          <Search />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More options"
              className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="!w-64">
            <DropdownMenuLabel className="flex items-center justify-between !text-[10px]">
              <span>{chat.name}</span>
              <span className="text-cyan-400 normal-case">{themeId}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => setRightPanel("details")}>
              <Users />
              {t("View profile")}
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setThemeOpen(true)}>
              <Palette />
              {t("Chat theme")}
              <Badge variant="cyan" className="ml-auto !text-[9px] !px-1.5">
                <Sparkles className="size-2" /> new
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setScheduleOpen(true)}>
              <CalendarClock />
              {t("Schedule message")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => pinChat(chat.id, !chat.pinned)}>
              <Pin />
              {chat.pinned ? t("Unpin chat") : t("Pin chat")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => muteChat(chat.id, !chat.muted)}>
              {chat.muted ? <Bell /> : <BellOff />}
              {chat.muted ? t("Unmute") : t("Mute notifications")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => favouriteChat(chat.id, !chat.favorite)}>
              <Star />
              {chat.favorite ? t("Remove from favorites") : t("Add to favorites")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => {
                // Export as a printable HTML transcript — opens in a new tab
                // where the user can choose "Save as PDF" from the print
                // dialog. Avoids pulling in a PDF library client-side.
                if (typeof window === "undefined") return;
                const list = messages[chat.id] ?? [];
                const meId = me?.id;
                const resolveName = (uid: string) => {
                  if (uid === meId) return me?.name || "You";
                  const p = profileCache[uid];
                  if (p) return p.name || p.username || "User";
                  return "User";
                };
                const esc = (s: string) =>
                  String(s)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;");
                const rows = list
                  .map((m) => {
                    const when = new Date(m.createdAt).toLocaleString();
                    const body = m.content
                      ? esc(m.content)
                      : `<em>[${esc(m.kind)}]</em>`;
                    return `<tr><td class="t">${esc(when)}</td><td class="a">${esc(
                      resolveName(m.authorId)
                    )}</td><td>${body}</td></tr>`;
                  })
                  .join("\n");
                const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(
                  chat.name
                )} — chat export</title><style>
                  body{font-family:system-ui,sans-serif;margin:32px;color:#111;}
                  h1{margin:0 0 4px;font-size:20px;}
                  .sub{color:#666;margin-bottom:16px;font-size:13px;}
                  table{width:100%;border-collapse:collapse;font-size:14px;}
                  th,td{padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top;text-align:left;}
                  .t{width:160px;color:#666;font-size:12px;white-space:nowrap;}
                  .a{width:140px;font-weight:600;}
                  @media print{body{margin:18mm;}}
                </style></head><body>
                  <h1>${esc(chat.name)}</h1>
                  <div class="sub">Exported ${esc(
                    new Date().toLocaleString()
                  )} · ${list.length} messages</div>
                  <table><thead><tr><th class="t">Time</th><th class="a">From</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table>
                  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script>
                </body></html>`;
                const w = window.open("", "_blank");
                if (w) {
                  w.document.write(html);
                  w.document.close();
                }
              }}
            >
              <Download />
              {t("Export chat")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setClearChatOpen(true)}>
              <Eraser />
              {t("Clear chat")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="!text-rose-500 hover:!text-rose-400 focus:!text-rose-400 dark:!text-rose-400 dark:hover:!text-rose-300 font-medium"
              onSelect={() => {
                if (chat.type !== "dm" || !otherMemberId) return;
                setBlockOpen(true);
              }}
            >
              <Ban />
              {t("Block contact")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="!text-rose-500 hover:!text-rose-400 focus:!text-rose-400 dark:!text-rose-400 dark:hover:!text-rose-300 font-medium"
              onSelect={() => setReportOpen(true)}
            >
              <Flag />
              {t("Report")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="!text-rose-500 hover:!text-rose-400 focus:!text-rose-400 dark:!text-rose-400 dark:hover:!text-rose-300 font-medium"
              onSelect={() => setDeleteChatOpen(true)}
            >
              <Trash2 />
              {t("Delete chat")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChatThemeDialog chatId={chat.id} open={themeOpen} onOpenChange={setThemeOpen} />

      <DeleteMessageDialog
        open={deleteOpen}
        count={selectedIds.length}
        canDeleteForEveryone={allSelectedAreMine}
        onClose={() => setDeleteOpen(false)}
        onDeleteForMe={async () => {
          await hideMessages(chat.id, selectedIds);
          clearSelection(chat.id);
          setDeleteOpen(false);
        }}
        onDeleteForEveryone={async () => {
          await removeMessages(chat.id, selectedIds);
          clearSelection(chat.id);
          setDeleteOpen(false);
        }}
      />

      <ScheduleMessageDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSchedule={(when, content) => {
          void sendAttachment(chat.id, {
            kind: "text",
            content,
            scheduleAt: when.toISOString()
          });
        }}
      />

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        chatName={chat.name}
      />

      <ConfirmChatDeletionDialog
        open={deleteChatOpen}
        chatName={chat.name}
        onClose={() => setDeleteChatOpen(false)}
        onConfirm={async () => {
          await removeChat(chat.id);
          setDeleteChatOpen(false);
          router.push("/chats");
        }}
      />

      <GlassConfirmDialog
        open={clearChatOpen}
        icon={<Eraser className="size-5" />}
        accent="rose"
        title={t("Clear chat?")}
        body={
          <>
            {t("This removes every message in")} <strong>{chat.name}</strong>{" "}
            {t("for you. The chat stays in your list.")}
          </>
        }
        confirmLabel={t("Clear chat")}
        onCancel={() => setClearChatOpen(false)}
        onConfirm={async () => {
          await clearChat(chat.id);
          setClearChatOpen(false);
        }}
      />

      <GlassConfirmDialog
        open={blockOpen}
        icon={<Ban className="size-5" />}
        accent="rose"
        title={t("Block contact?")}
        body={
          <>
            {t("They won't be able to message you. You can unblock from this chat at any time.")}
          </>
        }
        confirmLabel={t("Block")}
        onCancel={() => setBlockOpen(false)}
        onConfirm={async () => {
          if (chat.type !== "dm" || !otherMemberId) return;
          await blockUser(otherMemberId);
          setBlockOpen(false);
          // Stay on the chat — the BlockedOverlay rendered by chat-thread
          // takes over the surface with an Unblock button.
        }}
      />
    </div>
  );
}

/** A reusable glass confirmation modal with an icon, body, and a single
 *  destructive (rose) or primary (cyan) action button. */
function GlassConfirmDialog({
  open,
  icon,
  accent = "rose",
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm
}: {
  open: boolean;
  icon: React.ReactNode;
  accent?: "rose" | "cyan";
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!open || !mounted || typeof document === "undefined") return null;
  const accentBgIcon = accent === "rose" ? "bg-rose-500/15 text-rose-400" : "bg-cyan-500/15 text-cyan-400";
  const accentBtn =
    accent === "rose"
      ? "bg-rose-500 hover:bg-rose-500/90 text-white"
      : "bg-cyan-500 hover:bg-cyan-500/90 text-white";
  // Portal to <body> so a transformed/scrolled ancestor doesn't pull the
  // overlay off-center.
  return createPortal(
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[300] grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl glass-strong border border-border/60 p-5 shadow-floating animate-in zoom-in-95"
      >
        <div className={`mx-auto mb-2 size-12 rounded-2xl grid place-items-center ${accentBgIcon}`}>
          {icon}
        </div>
        <h3 className="text-center text-base font-semibold">{title}</h3>
        <div className="text-center text-xs text-muted-foreground mt-1 px-2">{body}</div>
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => void onConfirm()} className={`flex-1 ${accentBtn}`}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Minimal "Report this chat" dialog — captures a reason locally and shows
 *  an in-app confirmation. Persisting the report to a moderation queue is
 *  out of scope here. */
function ReportDialog({
  open,
  onClose,
  chatName
}: {
  open: boolean;
  onClose: () => void;
  chatName: string;
}) {
  const t = useT();
  const [reason, setReason] = React.useState("");
  const [sent, setSent] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setReason("");
      setSent(false);
    }
  }, [open]);

  const submit = () => {
    if (!reason.trim()) return;
    // For now: just acknowledge locally. When a moderation pipeline exists,
    // POST to it here.
    console.info("[report]", { chat: chatName, reason: reason.trim() });
    setSent(true);
    window.setTimeout(() => onClose(), 1400);
  };

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!open || !mounted || typeof document === "undefined") return null;
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl glass-strong border border-border/60 p-5 shadow-floating"
      >
        <div className="mx-auto mb-2 size-12 rounded-2xl bg-rose-500/15 text-rose-400 grid place-items-center">
          <Flag className="size-5" />
        </div>
        <h3 className="text-center text-base font-semibold">{t("Report chat")}</h3>
        <p className="text-center text-xs text-muted-foreground mt-1">
          {t("Tell us what's wrong with")} <strong>{chatName}</strong>.
        </p>
        {sent ? (
          <p className="text-center text-sm mt-4 text-emerald-400">
            {t("Thanks — your report has been sent.")}
          </p>
        ) : (
          <>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={t("What happened?")}
              className="w-full rounded-2xl glass-subtle px-4 py-3 text-sm outline-none resize-none mt-4 focus:ring-2 focus:ring-rose-400/60"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <Button variant="ghost" onClick={onClose} className="flex-1">
                {t("Cancel")}
              </Button>
              <Button
                onClick={submit}
                disabled={!reason.trim()}
                className="flex-1 bg-rose-500 hover:bg-rose-500/90 text-white"
              >
                {t("Submit")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function ConfirmChatDeletionDialog({
  open,
  chatName,
  onClose,
  onConfirm
}: {
  open: boolean;
  chatName: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const t = useT();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!open || !mounted || typeof document === "undefined") return null;
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl glass-strong border border-border/60 p-5 shadow-floating"
      >
        <div className="mx-auto mb-2 size-12 rounded-2xl bg-rose-500/15 text-rose-400 grid place-items-center">
          <Trash2 className="size-5" />
        </div>
        <h3 className="text-center text-base font-semibold">{t("Delete chat?")}</h3>
        <p className="text-center text-xs text-muted-foreground mt-1 px-2">
          {t("This permanently removes")} <strong>{chatName}</strong>{" "}
          {t("and every message inside it for everyone. This can't be undone.")}
        </p>
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {t("Cancel")}
          </Button>
          <Button
            onClick={() => void onConfirm()}
            className="flex-1 bg-rose-500 hover:bg-rose-500/90 text-white"
          >
            {t("Delete chat")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function PinnedBar({ pinned }: { pinned?: string }) {
  if (!pinned) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-card/60 dark:bg-card/55 backdrop-blur-xl backdrop-saturate-180 text-xs">
      <PinIcon className="size-3.5 text-amber-400" />
      <span className="text-muted-foreground line-clamp-1 flex-1">Pinned: {pinned}</span>
      <button className="text-cyan-400 hover:underline text-[11px]">view all</button>
    </div>
  );
}
