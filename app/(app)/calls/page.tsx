"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  ChevronLeft,
  Ghost,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  TrendingUp,
  Video,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StartCallDialog } from "@/features/calls/start-call-dialog";
import { ScheduleCallDialog } from "@/features/calls/schedule-call-dialog";
import { GhostCallDialog } from "@/features/calls/ghost-call-dialog";
import { useChatStore } from "@/store/use-chat-store";
import { useUIStore } from "@/store/use-ui-store";
import { useCallStore, type CallHistoryEntry } from "@/store/use-call-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Kinds we track in the call history. "rejected" is a declined incoming /
 *  outgoing — duration "—" like missed but visually distinct. */
type CallKind = "incoming" | "outgoing" | "missed" | "rejected";

/** UI-shape adapter — turn a CallHistoryEntry from the store into the
 *  flat shape the existing HistoryRow component expects. */
interface HistoryEntry {
  id: string;
  sessionId: string;
  name: string;
  avatar: string | null;
  counterpartyId: string | null;
  kind: CallKind;
  duration: string;
  time: string;
  video?: boolean;
}

function fmtRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const dayMs = 86400_000;
  const diff = now - t;
  if (diff < dayMs) {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });
  }
  if (diff < dayMs * 2) return "Yesterday";
  if (diff < dayMs * 7) return `${Math.floor(diff / dayMs)} days ago`;
  return "Last week";
}

function fmtDurationLabel(seconds: number): string {
  if (seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function adaptHistory(rows: CallHistoryEntry[]): HistoryEntry[] {
  return rows.map((r) => {
    let kind: CallKind = r.direction;
    if (r.status === "missed") kind = "missed";
    else if (r.status === "rejected") kind = "rejected";
    return {
      id: r.id,
      sessionId: r.sessionId,
      name: r.counterparty?.name ?? "Group call",
      avatar: r.counterparty?.avatar ?? null,
      counterpartyId: r.counterparty?.id ?? null,
      kind,
      duration: fmtDurationLabel(r.durationSec),
      time: fmtRelative(r.startedAt),
      video: r.video
    };
  });
}

const kindIcon: Record<CallKind, React.ReactNode> = {
  incoming: <PhoneIncoming className="size-3.5 text-emerald-400" />,
  outgoing: <PhoneOutgoing className="size-3.5 text-cyan-400" />,
  missed: <PhoneMissed className="size-3.5 text-rose-400" />,
  rejected: <PhoneOff className="size-3.5 text-amber-400" />
};

type Filter = "all" | "missed" | "dialed" | "rejected";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "missed", label: "Missed" },
  { id: "dialed", label: "Dialed" },
  { id: "rejected", label: "Rejected" }
];

function applyFilter(rows: HistoryEntry[], f: Filter): HistoryEntry[] {
  if (f === "all") return rows;
  if (f === "missed") return rows.filter((h) => h.kind === "missed");
  if (f === "dialed") return rows.filter((h) => h.kind === "outgoing");
  if (f === "rejected") return rows.filter((h) => h.kind === "rejected");
  return rows;
}

/** Parse "MM:SS" or "H:MM:SS" → total seconds. "—" / blank → 0. */
function parseDurationSec(s: string): number {
  if (!s || s === "—") return 0;
  const parts = s.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatTotal(seconds: number): { primary: string; secondary: string } {
  if (seconds === 0) return { primary: "0m", secondary: "this week" };
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return {
      primary: `${h}h ${String(m).padStart(2, "0")}m`,
      secondary: "this week"
    };
  return {
    primary: `${m}m ${String(s).padStart(2, "0")}s`,
    secondary: "this week"
  };
}

interface UpcomingCall {
  id: string;
  chatId: string;
  title: string;
  whenIso: string;
  video: boolean;
  participants: number;
}

/** Format an ISO timestamp into a friendly "Today · 4:00 PM" string. The
 *  `tr` translator localizes the Today/Tomorrow words; the date/time portions
 *  follow the browser locale. */
function formatScheduledWhen(iso: string, tr: (s: string) => string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const clock = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
  if (sameDay(d, now)) return `${tr("Today")} · ${clock}`;
  if (sameDay(d, tomorrow)) return `${tr("Tomorrow")} · ${clock}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${clock}`;
}

export default function CallsPage() {
  const t = useT();
  const router = useRouter();
  const startDM = useChatStore((s) => s.startDM);
  const startCall = useUIStore((s) => s.startCall);
  const callHistoryRaw = useCallStore((s) => s.history);
  const callUpcoming = useCallStore((s) => s.upcoming);
  const stats = useCallStore((s) => s.stats);
  const historyLoaded = useCallStore((s) => s.historyLoaded);
  const fetchHistory = useCallStore((s) => s.fetchHistory);
  const fetchUpcoming = useCallStore((s) => s.fetchUpcoming);

  // Load real call history + scheduled rows on mount. Refresh both whenever
  // the incoming/outgoing call lifecycle ends so the dashboard reflects the
  // call that just wrapped without a hard refresh.
  const incoming = useCallStore((s) => s.incoming);
  const outgoing = useCallStore((s) => s.outgoing);
  React.useEffect(() => {
    void fetchHistory();
    void fetchUpcoming();
  }, [fetchHistory, fetchUpcoming, incoming, outgoing]);

  const history: HistoryEntry[] = React.useMemo(
    () => adaptHistory(callHistoryRaw),
    [callHistoryRaw]
  );

  const [startOpen, setStartOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [ghostOpen, setGhostOpen] = React.useState(false);
  const [viewAll, setViewAll] = React.useState(false);
  const [viewAllSchedule, setViewAllSchedule] = React.useState(false);
  const [filter, setFilter] = React.useState<Filter>("all");

  const filtered = applyFilter(history, filter);

  const totalFmt = formatTotal(stats.totalSec);
  const incomingFmt = formatTotal(stats.incomingSec);
  const outgoingFmt = formatTotal(stats.outgoingSec);

  // Upcoming card now reads directly from call_sessions rows where
  // status='scheduled', surfaced by useCallStore.fetchUpcoming(). The
  // legacy "schedule" chat messages are still rendered as their own
  // ScheduleBubble inside the chat thread (separate path).
  const upcoming = React.useMemo<UpcomingCall[]>(() => {
    return callUpcoming.map((u) => ({
      id: u.id,
      chatId: u.chatId,
      title: u.title,
      whenIso: u.scheduledForIso,
      video: u.video,
      participants: u.participantsCount
    }));
  }, [callUpcoming]);

  const joinScheduled = (u: UpcomingCall) => {
    startCall({
      chatId: u.chatId,
      name: u.title,
      video: u.video,
      group: u.participants > 2,
      participants: u.participants,
      returnTo: "/calls"
    });
    router.push("/calls/active");
  };

  /** Start a 1-on-1 callback to the counterparty of a history row. Reuses
   *  the existing DM (or creates one) so End correctly returns to the
   *  Calls tab. The History list calls this when the user taps the small
   *  phone / video icons on a row. */
  const callUser = async (entry: HistoryEntry, video: boolean) => {
    if (!entry.counterpartyId) return;
    const result = await startDM(entry.counterpartyId);
    const chatId = result.data?.id;
    if (!chatId) return;
    startCall({
      chatId,
      name: entry.name,
      avatar: entry.avatar ?? undefined,
      video,
      group: false,
      participants: 2,
      returnTo: "/calls"
    });
    router.push("/calls/active");
  };

  return (
    // Mobile: the whole page scrolls naturally — there isn't room for fixed
    // layouts on small screens. Desktop (md+): lock to the viewport so the
    // header + action grid stay put and only the bottom cards scroll
    // internally. Tailwind `md:*` switches between the two regimes.
    <div className="md:h-[calc(100dvh-4rem)] md:overflow-hidden overflow-y-auto h-[calc(100dvh-4rem)]">
      <div className="max-w-7xl mx-auto md:h-full px-4 md:px-8 py-6 md:py-8 flex flex-col">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="shrink-0">
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            <span className="neon-text">{t("Calls & meetings")}</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            {t("Crystal-clear voice and video. AI noise cancellation, live captions, and floating mini calls — all built in.")}
          </p>
        </motion.div>

        {/* Layout order: Start, Ghost, Schedule, then the wide Total time
            card. `grid-flow-dense` lets the 2-col-spanning Total card slot in
            wherever it fits on each breakpoint without leaving gaps. */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 grid-flow-dense mt-6 shrink-0">
          <ActionTile
            icon={<Video />}
            title={t("Start a call")}
            subtitle={t("Pick people & ring")}
            gradient="from-violet-500 to-fuchsia-500"
            onClick={() => setStartOpen(true)}
            cta
          />
          <ActionTile
            icon={<Ghost />}
            title={t("Ghost call")}
            subtitle={t("Ring with no identity")}
            gradient="from-violet-500 via-fuchsia-500 to-cyan-400"
            onClick={() => setGhostOpen(true)}
          />
          <ActionTile
            icon={<CalendarClock />}
            title={t("Schedule")}
            subtitle={t("Plan with your circle")}
            gradient="from-amber-400 to-pink-500"
            onClick={() => setScheduleOpen(true)}
          />
          <TotalTimeCard
            total={totalFmt.primary}
            totalLabel={totalFmt.secondary}
            incoming={incomingFmt.primary}
            outgoing={outgoingFmt.primary}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3 md:flex-1 md:min-h-0">
          {/* Recent calls — header stays fixed; the list scrolls inside the
              card so the card never balloons past the viewport. */}
          <div className="lg:col-span-2 glass rounded-3xl p-6 flex flex-col md:h-full md:min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-lg font-semibold">{t("Recent calls")}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAll(true)}
                disabled={history.length === 0}
              >
                {t("View all")}
              </Button>
            </div>

            <div className="shrink-0">
              <FilterChips filter={filter} onChange={setFilter} />
            </div>

            {/* Desktop scrolls within the card (`md:flex-1 md:overflow-y-auto`);
                mobile lets the list flow naturally so the whole page scrolls. */}
            <div className="mt-4 md:flex-1 md:min-h-0 md:overflow-y-auto -mx-2 no-scrollbar">
              <div className="space-y-1 px-2">
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={<PhoneCall className="size-5" />}
                    title={
                      history.length === 0
                        ? t("No call history")
                        : t("No calls match")
                    }
                    body={
                      history.length === 0
                        ? t("Once you make or receive a call it'll show up here.")
                        : t("Try a different filter or start a new call.")
                    }
                  />
                ) : (
                  filtered.map((h) => (
                    <HistoryRow key={h.id} entry={h} onCall={callUser} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Upcoming — same fixed-header + scrolling-list pattern. */}
          <div className="glass rounded-3xl p-6 flex flex-col md:h-full md:min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-lg font-semibold">{t("Upcoming")}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSchedule(true)}
                disabled={upcoming.length === 0}
              >
                {t("View all")}
              </Button>
            </div>
            <div className="md:flex-1 md:min-h-0 md:overflow-y-auto -mx-2 no-scrollbar">
              <div className="space-y-3 px-2">
                {upcoming.length === 0 ? (
                  <EmptyState
                  icon={<CalendarClock className="size-5" />}
                  title={t("No scheduled calls")}
                  body={t("Hit Schedule to plan one with your circle.")}
                  compact
                />
              ) : (
                upcoming.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => joinScheduled(u)}
                    className="w-full text-left glass-subtle rounded-xl p-3 hover:bg-foreground/[0.04] transition"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {u.video ? (
                        <Video className="size-3.5 text-violet-300" />
                      ) : (
                        <Phone className="size-3.5 text-emerald-300" />
                      )}
                      <span className="truncate">{u.title}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {formatScheduledWhen(u.whenIso, t)}
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex -space-x-2">
                        {Array.from({ length: Math.min(4, u.participants) }).map((_, i) => (
                          <div
                            key={i}
                            className="size-6 rounded-full bg-foreground/10 ring-2 ring-background"
                          />
                        ))}
                        {u.participants > 4 && (
                          <div className="size-6 rounded-full bg-foreground/5 ring-2 ring-background grid place-items-center text-[9px]">
                            +{u.participants - 4}
                          </div>
                        )}
                      </div>
                      <Badge variant="cyan">{t("Join")}</Badge>
                    </div>
                  </button>
                ))
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <StartCallDialog open={startOpen} onOpenChange={setStartOpen} />
      <ScheduleCallDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <GhostCallDialog open={ghostOpen} onOpenChange={setGhostOpen} />

      <FullScreenHistory
        open={viewAll}
        onClose={() => setViewAll(false)}
        filter={filter}
        onFilterChange={setFilter}
        rows={history}
        onCall={callUser}
      />

      <FullScreenSchedule
        open={viewAllSchedule}
        onClose={() => setViewAllSchedule(false)}
        rows={upcoming}
        onJoin={joinScheduled}
      />
    </div>
  );
}

/* ---------- ActionTile ---------- */

function ActionTile({
  icon,
  title,
  subtitle,
  gradient,
  cta,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
  cta?: boolean;
  onClick?: () => void;
}) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      // No hover-lift — just a clean border highlight (white in dark, black
      // in light) so the card stays put visually.
      className={cn(
        "relative overflow-hidden rounded-3xl glass p-5 cursor-pointer text-left flex flex-col",
        "transition-[border-color,box-shadow] duration-200",
        "hover:border-black/40 dark:hover:border-white/60"
      )}
    >
      <div className={`size-12 rounded-2xl bg-gradient-to-br ${gradient} grid place-items-center text-white shadow-glow [&_svg]:size-[22px]`}>
        {icon}
      </div>
      <div className="mt-3">
        <h3 className="font-semibold text-lg leading-tight">{title}</h3>
        <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
      </div>
      {cta && (
        <Badge variant="default" className="absolute top-3 right-3 !text-[9px] !py-0 !px-1.5">
          {t("New")}
        </Badge>
      )}
    </button>
  );
}

/* ---------- TotalTimeCard ---------- */

function TotalTimeCard({
  total,
  totalLabel,
  incoming,
  outgoing
}: {
  total: string;
  totalLabel: string;
  incoming: string;
  outgoing: string;
}) {
  const t = useT();
  return (
    <div
      // Same flex-col rhythm as ActionTile so the title/subtitle baselines
      // line up across the row. Border + radius + padding match the Recent
      // calls / Upcoming cards below for a consistent design language.
      className={cn(
        "relative overflow-hidden rounded-3xl glass p-5 sm:col-span-2 lg:col-span-2 flex flex-col",
        "transition-[border-color,box-shadow] duration-200",
        "hover:border-black/40 dark:hover:border-white/60"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 size-32 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(34,211,238,0.35), transparent 70%)"
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-8 size-36 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(167,139,250,0.30), transparent 70%)"
        }}
      />

      {/* Icon — sits in the same flow as an action tile's icon. The pills
          float out to the top-right via absolute positioning so they don't
          inflate the icon row height (which would push the title down). */}
      <div className="relative size-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 grid place-items-center text-white shadow-glow-cyan [&_svg]:size-[22px]">
        <TrendingUp />
      </div>

      <div className="absolute top-5 right-5 flex flex-col gap-1 min-w-[140px]">
        <TimeSplit
          icon={<PhoneIncoming className="size-3.5" />}
          label={t("Incoming")}
          value={incoming}
          accent="emerald"
        />
        <TimeSplit
          icon={<PhoneOutgoing className="size-3.5" />}
          label={t("Outgoing")}
          value={outgoing}
          accent="cyan"
        />
      </div>

      {/* Title + subtitle + total stacked together, with the SAME small
          gap from the icon row that the action tiles use (mt-3). */}
      <div className="relative mt-3 min-w-0">
        <h3 className="font-semibold text-lg leading-tight">{t("Total call time")}</h3>
        <div className="text-lg font-display font-semibold tracking-tight tabular-nums leading-none mt-1.5">
          {total}
        </div>
      </div>
    </div>
  );
}

function TimeSplit({
  icon,
  label,
  value,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "cyan";
}) {
  return (
    <div className="glass-subtle rounded-xl px-3.5 py-2">
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] uppercase tracking-wider leading-none",
          accent === "emerald" ? "text-emerald-300" : "text-cyan-300"
        )}
      >
        {icon}
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}

/* ---------- Filter chips ---------- */

function FilterChips({
  filter,
  onChange
}: {
  filter: Filter;
  onChange: (f: Filter) => void;
}) {
  const t = useT();
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition",
            filter === f.id
              ? "bg-foreground text-background"
              : "glass-subtle text-muted-foreground hover:text-foreground"
          )}
        >
          {t(f.label)}
        </button>
      ))}
    </div>
  );
}

/* ---------- Empty state ---------- */

function EmptyState({
  icon,
  title,
  body,
  compact
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center text-center text-sm",
        compact ? "py-8" : "py-12"
      )}
    >
      <div className="size-10 rounded-2xl bg-foreground/10 grid place-items-center text-muted-foreground">
        {icon}
      </div>
      <p className="font-medium mt-3">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{body}</p>
    </div>
  );
}

/* ---------- History row ---------- */

function HistoryRow({
  entry,
  onCall
}: {
  entry: HistoryEntry;
  onCall: (entry: HistoryEntry, video: boolean) => void;
}) {
  const t = useT();
  // Group calls + ghost calls don't expose a counterparty — callback
  // buttons are disabled because the call store needs a target user id
  // for startDM.
  const canCallBack = !!entry.counterpartyId;
  return (
    <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-foreground/[0.04] transition">
      <Avatar className="size-10">
        <AvatarImage src={entry.avatar ?? undefined} />
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{entry.name}</span>
          {kindIcon[entry.kind]}
          {entry.video && <Video className="size-3 text-muted-foreground" />}
        </div>
        <div className="text-xs text-muted-foreground">
          {entry.time} · {entry.duration}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onCall(entry, false)}
        disabled={!canCallBack}
        aria-label={`${t("Voice call")} ${entry.name}`}
      >
        <PhoneCall className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onCall(entry, true)}
        disabled={!canCallBack}
        aria-label={`${t("Video call")} ${entry.name}`}
      >
        <Video className="size-4" />
      </Button>
    </div>
  );
}

/* ---------- Full-screen view-all ---------- */

function FullScreenHistory({
  open,
  onClose,
  filter,
  onFilterChange,
  rows,
  onCall
}: {
  open: boolean;
  onClose: () => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  rows: HistoryEntry[];
  onCall: (entry: HistoryEntry, video: boolean) => void;
}) {
  const t = useT();
  const filtered = applyFilter(rows, filter);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[120] bg-background"
        >
          <div className="h-[calc(100dvh)] flex flex-col">
            <header className="flex items-center gap-2 px-4 md:px-8 h-16 border-b border-border/40 backdrop-blur-xl bg-card/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={t("Back to calls")}
                className="[&_svg]:size-6"
              >
                <ChevronLeft />
              </Button>
              <h1 className="font-display text-xl font-semibold tracking-tight">
                {t("Call history")}
              </h1>
              <span className="text-xs text-muted-foreground ml-2">
                {filtered.length} {filtered.length === 1 ? t("entry") : t("entries")}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label={t("Close")}
                className="ml-auto"
              >
                <X className="size-4" />
              </Button>
            </header>

            <div className="px-4 md:px-8 py-4 border-b border-border/40">
              <FilterChips filter={filter} onChange={onFilterChange} />
            </div>

            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto px-2 md:px-8 py-4">
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={<PhoneCall className="size-5" />}
                    title={
                      rows.length === 0
                        ? t("No call history")
                        : t("No calls match")
                    }
                    body={
                      rows.length === 0
                        ? t("Once you make or receive a call it'll show up here.")
                        : t("Try a different filter or start a new call.")
                    }
                  />
                ) : (
                  <div className="space-y-1">
                    {filtered.map((h) => (
                      <HistoryRow key={h.id} entry={h} onCall={onCall} />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Full-screen scheduled calls ---------- */

function FullScreenSchedule({
  open,
  onClose,
  rows,
  onJoin
}: {
  open: boolean;
  onClose: () => void;
  rows: UpcomingCall[];
  onJoin: (u: UpcomingCall) => void;
}) {
  const t = useT();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[120] bg-background"
        >
          <div className="h-[calc(100dvh)] flex flex-col">
            <header className="flex items-center gap-2 px-4 md:px-8 h-16 border-b border-border/40 backdrop-blur-xl bg-card/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={t("Back to calls")}
                className="[&_svg]:size-6"
              >
                <ChevronLeft />
              </Button>
              <h1 className="font-display text-xl font-semibold tracking-tight">
                {t("Scheduled calls")}
              </h1>
              <span className="text-xs text-muted-foreground ml-2">
                {rows.length} {rows.length === 1 ? t("call") : t("calls")}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label={t("Close")}
                className="ml-auto"
              >
                <X className="size-4" />
              </Button>
            </header>

            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
                {rows.length === 0 ? (
                  <EmptyState
                    icon={<CalendarClock className="size-5" />}
                    title={t("No scheduled calls")}
                    body={t("Hit Schedule to plan one with your circle.")}
                  />
                ) : (
                  <div className="space-y-2">
                    {rows.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onJoin(u);
                          onClose();
                        }}
                        className="w-full text-left glass rounded-2xl p-4 hover:bg-foreground/[0.04] transition flex items-center gap-4"
                      >
                        <div
                          className={cn(
                            "size-11 rounded-xl grid place-items-center text-white shadow-glow [&_svg]:size-5 shrink-0",
                            u.video
                              ? "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                              : "bg-gradient-to-br from-emerald-400 to-cyan-400"
                          )}
                        >
                          {u.video ? <Video /> : <Phone />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">
                            {u.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatScheduledWhen(u.whenIso, t)} · {u.participants}{" "}
                            {u.participants === 1 ? t("invitee") : t("invitees")}
                          </div>
                        </div>
                        <Badge variant="cyan" className="shrink-0">{t("Join")}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
