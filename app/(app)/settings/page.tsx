"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Lock,
  Palette,
  Shield,
  Smartphone,
  HardDrive,
  Sparkles,
  Languages,
  Monitor,
  Sun,
  Moon,
  CheckCircle2,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Laptop,
  Tablet,
  LogOut
} from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChatThemeDialog } from "@/features/chat/chat-theme-dialog";
import {
  CHAT_THEMES,
  CUSTOM_THEME_ID,
  useChatThemeStore
} from "@/store/use-chat-theme-store";
import {
  ACCENTS,
  LANGUAGES,
  useSettingsStore,
  type DeviceKind
} from "@/store/use-settings-store";
import { useVaultStore } from "@/store/use-vault-store";
import { useAuthStore } from "@/store/use-auth-store";
import { FONT_OPTIONS } from "@/app/fonts";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const sections = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "security", label: "Security", icon: Shield },
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "language", label: "Language", icon: Languages }
];

const DEVICE_ICON: Record<DeviceKind, React.ReactNode> = {
  laptop: <Laptop />,
  phone: <Smartphone />,
  tablet: <Tablet />,
  monitor: <Monitor />
};

function formatBytes(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b >= 1e3) return (b / 1e3).toFixed(0) + " KB";
  return b + " B";
}

export default function SettingsPage() {
  // Suspense boundary required by Next for the useSearchParams() inside.
  return (
    <React.Suspense fallback={null}>
      <SettingsContent />
    </React.Suspense>
  );
}

function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const t = useT();
  const logout = useAuthStore((st) => st.logout);
  const [section, setSection] = React.useState("appearance");
  const [mobileDetail, setMobileDetail] = React.useState(false);

  // A `?section=…` query param (e.g. from the notification popup's "Open
  // notification settings") deep-links straight to that tab — and on mobile
  // opens its detail view. Read reactively via useSearchParams so it also
  // switches tabs when the page is *already* mounted (navigating to the same
  // route with a new query doesn't remount).
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  React.useEffect(() => {
    if (sectionParam && sections.some((x) => x.id === sectionParam)) {
      setSection(sectionParam);
      setMobileDetail(true);
    }
  }, [sectionParam]);
  const [chatThemeOpen, setChatThemeOpen] = React.useState(false);

  const handleSignOut = () => {
    logout();
    router.push("/");
  };

  // Settings persist in localStorage; gate the controlled inputs behind a
  // mounted flag so the first client render matches SSR (no hydration drift).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const s = useSettingsStore();

  const globalTheme = useChatThemeStore((st) => st.globalTheme);
  const globalCustomBg = useChatThemeStore((st) => st.globalCustomBg);
  const globalThemePreset = CHAT_THEMES.find((t) => t.id === globalTheme);
  const globalThemeName =
    globalTheme === CUSTOM_THEME_ID
      ? "Custom photo"
      : globalThemePreset?.name ?? "Default";
  const globalThemeSwatch =
    globalTheme === CUSTOM_THEME_ID && globalCustomBg
      ? `url("${globalCustomBg}") center/cover no-repeat`
      : globalThemePreset?.category === "photo" || globalThemePreset?.category === "pattern"
        ? globalThemePreset.bg
        : globalThemePreset?.bubbleMe ?? CHAT_THEMES[0].bubbleMe;

  const openSection = (id: string) => {
    setSection(id);
    setMobileDetail(true);
  };

  return (
    // `rtl:flex-row-reverse` keeps the sections list on the physical left for
    // RTL languages (Arabic), matching the main nav sidebar; the detail pane
    // stays RTL so its content still reads right-to-left.
    <div className="flex h-[calc(100dvh-4rem)] rtl:flex-row-reverse">
      <aside
        // LTR internals so the rail looks the same in every language
        // (icon-left, label, chevron pinned to the right via ml-auto).
        dir="ltr"
        className={cn(
          "shrink-0 flex-col border-r border-border/40 bg-card/30 backdrop-blur-xl",
          "md:flex md:w-64",
          mobileDetail ? "hidden" : "flex w-full"
        )}
      >
        <div className="px-5 pt-6 pb-4 md:p-5">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-sm md:text-xs text-muted-foreground hover:text-foreground transition mb-3 md:mb-2"
          >
            <ChevronLeft className="size-4 md:size-3.5" />
            {t("Profile")}
          </Link>
          <h2 className="font-display text-3xl md:text-xl font-semibold tracking-tight">
            {t("Settings")}
          </h2>
          <p className="text-sm md:text-xs text-muted-foreground mt-1">
            {t("Tune Obsidian to feel like yours.")}
          </p>
        </div>
        <ScrollArea className="flex-1 px-3 pb-3">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => openSection(sec.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-4 md:px-3 md:py-2.5 rounded-2xl md:rounded-xl text-[17px] md:text-sm font-medium md:font-normal transition",
                section === sec.id
                  ? "md:bg-foreground/10 md:text-foreground text-foreground hover:bg-foreground/[0.04]"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
              )}
            >
              <sec.icon className="size-[22px] md:size-4 shrink-0" />
              <span className="flex-1 text-left leading-none">{t(sec.label)}</span>
              <ChevronRight
                className={cn(
                  "shrink-0",
                  section === sec.id
                    ? "md:inline hidden md:size-3"
                    : "md:hidden inline size-4 opacity-50"
                )}
              />
            </button>
          ))}

          {/* Sign out — sits below the section list, in red. */}
          <div className="my-2 border-t border-border/40" />
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-4 md:px-3 md:py-2.5 rounded-2xl md:rounded-xl text-[17px] md:text-sm font-medium md:font-normal text-rose-500 hover:bg-rose-500/10 transition"
          >
            <LogOut className="size-[22px] md:size-4 shrink-0" />
            <span className="flex-1 text-left leading-none">{t("Sign out")}</span>
          </button>
        </ScrollArea>
      </aside>

      <ScrollArea className={cn("flex-1", "md:block", mobileDetail ? "block" : "hidden")}>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <button
            onClick={() => setMobileDetail(false)}
            className="md:hidden mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ChevronLeft className="size-4" />
            {t("All settings")}
          </button>

          {!mounted ? (
            <div className="h-40 grid place-items-center text-sm text-muted-foreground">
              {t("Loading settings…")}
            </div>
          ) : (
            <>
              {section === "appearance" && (
                <Section title={t("Appearance")} subtitle={t("Make Obsidian feel like home.")}>
                  <Setting label={t("Theme")} sub={t("Light, dark, or follow system.")}>
                    <div className="flex gap-1.5 p-1 rounded-xl glass-subtle">
                      {[
                        { id: "light", label: "Light", icon: <Sun className="size-3.5" /> },
                        { id: "dark", label: "Dark", icon: <Moon className="size-3.5" /> },
                        { id: "system", label: "System", icon: <Monitor className="size-3.5" /> }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setTheme(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1.5",
                            theme === opt.id
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {opt.icon}
                          {t(opt.label)}
                        </button>
                      ))}
                    </div>
                  </Setting>

                  <Setting label={t("Accent color")} sub={t("Used across highlights, links, and AI glow.")}>
                    <div className="flex gap-2">
                      {ACCENTS.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => s.setAccent(a.id)}
                          title={a.name}
                          className={cn(
                            "size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition",
                            s.accent === a.id ? "ring-foreground" : "ring-transparent"
                          )}
                          style={{ background: a.hex }}
                        />
                      ))}
                    </div>
                  </Setting>

                  <Setting label={t("Font")} sub={t("Typeface used across the app.")}>
                    <FontDropdown value={s.font} onChange={s.setFont} />
                  </Setting>

                  <Setting label={t("Glass intensity")} sub={t("Backdrop blur in surfaces.")}>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[s.glass]}
                        onValueChange={(v) => s.setGlass(v[0])}
                        min={0}
                        max={100}
                        step={5}
                        className="w-40"
                      />
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                        {s.glass}%
                      </span>
                    </div>
                  </Setting>

                  <Setting label={t("Reduce motion")} sub={t("Disable parallax and float animations.")}>
                    <Switch checked={s.reduceMotion} onCheckedChange={s.setReduceMotion} />
                  </Setting>

                  <Setting
                    label={t("Default chat theme")}
                    sub={t("Applied to every conversation. Individual chats can still override it.")}
                  >
                    <button
                      onClick={() => setChatThemeOpen(true)}
                      className="flex items-center gap-2.5 rounded-xl glass-subtle pl-1.5 pr-3 py-1.5 hover:bg-foreground/[0.06] transition"
                    >
                      <span
                        className="size-7 rounded-lg ring-1 ring-white/10 shrink-0"
                        style={{ background: globalThemeSwatch }}
                      />
                      <span className="text-xs font-medium">{globalThemeName}</span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </button>
                  </Setting>
                </Section>
              )}

              {section === "notifications" && (
                <Section title={t("Notifications")} subtitle={t("Who gets to interrupt you.")}>
                  <Setting label={t("Direct messages")} sub={t("Mentions, DMs, replies")}>
                    <Switch
                      checked={s.notifications.directMessages}
                      onCheckedChange={(v) => s.toggleNotification("directMessages", v)}
                    />
                  </Setting>
                  <Setting label={t("Group chats")} sub={t("Only highlights")}>
                    <Switch
                      checked={s.notifications.groupChats}
                      onCheckedChange={(v) => s.toggleNotification("groupChats", v)}
                    />
                  </Setting>
                  <Setting label={t("Ghost rooms")} sub={t("Anonymous activity")}>
                    <Switch
                      checked={s.notifications.ghostRooms}
                      onCheckedChange={(v) => s.toggleNotification("ghostRooms", v)}
                    />
                  </Setting>
                  <Setting label={t("Call invitations")} sub={t("Ringtones and banner alerts")}>
                    <Switch
                      checked={s.notifications.callInvites}
                      onCheckedChange={(v) => s.toggleNotification("callInvites", v)}
                    />
                  </Setting>
                  <Setting label={t("Sounds")} sub={t("Subtle haptics and audio cues")}>
                    <Switch
                      checked={s.notifications.sounds}
                      onCheckedChange={(v) => s.toggleNotification("sounds", v)}
                    />
                  </Setting>
                </Section>
              )}

              {section === "privacy" && (
                <Section title={t("Privacy")} subtitle={t("Default deny. Choose what to allow.")}>
                  <Setting label={t("Read receipts")} sub={t("Let others know when you've read")}>
                    <Switch
                      checked={s.privacy.readReceipts}
                      onCheckedChange={(v) => s.togglePrivacy("readReceipts", v)}
                    />
                  </Setting>
                  <Setting label={t("Typing indicator")} sub={t("Show three dots while typing")}>
                    <Switch
                      checked={s.privacy.typingIndicator}
                      onCheckedChange={(v) => s.togglePrivacy("typingIndicator", v)}
                    />
                  </Setting>
                  <Setting label={t("Last seen")} sub={t("Friends only")}>
                    <Switch
                      checked={s.privacy.lastSeen}
                      onCheckedChange={(v) => s.togglePrivacy("lastSeen", v)}
                    />
                  </Setting>
                  <Setting label={t("Profile photo")} sub={t("Visible to: everyone")}>
                    <Switch
                      checked={s.privacy.profilePhoto}
                      onCheckedChange={(v) => s.togglePrivacy("profilePhoto", v)}
                    />
                  </Setting>
                  <Setting label={t("Allow screenshots in chats")} sub={t("Block by default")}>
                    <Switch
                      checked={s.privacy.allowScreenshots}
                      onCheckedChange={(v) => s.togglePrivacy("allowScreenshots", v)}
                    />
                  </Setting>
                </Section>
              )}

              {section === "security" && (
                <Section title={t("Security dashboard")} subtitle={t("Your account passport.")}>
                  <SecurityScore security={s.security} />
                  <Setting label={t("Two-factor authentication")} sub={t("App + backup codes")}>
                    <Switch
                      checked={s.security.twoFactor}
                      onCheckedChange={(v) => s.toggleSecurity("twoFactor", v)}
                    />
                  </Setting>
                  <Setting label={t("Biometric unlock")} sub={t("Use Face ID or Windows Hello")}>
                    <Switch
                      checked={s.security.biometric}
                      onCheckedChange={(v) => s.toggleSecurity("biometric", v)}
                    />
                  </Setting>
                  <Setting label={t("Login alerts")} sub={t("Email me when something signs in")}>
                    <Switch
                      checked={s.security.loginAlerts}
                      onCheckedChange={(v) => s.toggleSecurity("loginAlerts", v)}
                    />
                  </Setting>
                  <Setting label={t("Auto-lock vault")} sub={t("After 5 minutes of inactivity")}>
                    <Switch
                      checked={s.security.autoLockVault}
                      onCheckedChange={(v) => s.toggleSecurity("autoLockVault", v)}
                    />
                  </Setting>
                </Section>
              )}

              {section === "devices" && (
                <Section title={t("Devices")} subtitle={t("Where Obsidian is currently active.")}>
                  {s.devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 p-3 rounded-xl glass-subtle mt-2"
                    >
                      <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center [&_svg]:size-4">
                        {DEVICE_ICON[d.kind]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {d.name}
                          {d.current && (
                            <span className="text-muted-foreground font-normal"> · {t("this device")}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {d.location} · {d.lastActive}
                        </p>
                      </div>
                      {d.current ? (
                        <Badge variant="success" className="shrink-0">
                          <CheckCircle2 className="size-3" /> {t("Active")}
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => s.signOutDevice(d.id)}
                        >
                          {t("Sign out")}
                        </Button>
                      )}
                    </div>
                  ))}
                  {s.devices.filter((d) => !d.current).length === 0 && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      {t("No other devices signed in.")}
                    </p>
                  )}
                </Section>
              )}

              {section === "storage" && <StorageSection />}

              {section === "ai" && (
                <Section title={t("AI settings")} subtitle={t("Tune Obsidian's intelligence to your taste.")}>
                  <Setting label={t("On-device suggestions")} sub={t("Smart replies and message drafts")}>
                    <Switch
                      checked={s.ai.onDeviceSuggestions}
                      onCheckedChange={(v) => s.toggleAi("onDeviceSuggestions", v)}
                    />
                  </Setting>
                  <Setting label={t("Cloud assist")} sub={t("Summaries, translations, generations")}>
                    <Switch
                      checked={s.ai.cloudAssist}
                      onCheckedChange={(v) => s.toggleAi("cloudAssist", v)}
                    />
                  </Setting>
                  <Setting label={t("Read my conversations")} sub={t("Required for chat-aware AI")}>
                    <Switch
                      checked={s.ai.readConversations}
                      onCheckedChange={(v) => s.toggleAi("readConversations", v)}
                    />
                  </Setting>
                  <Setting label={t("Voice cloning")} sub={t("Allow Obsidian to mimic your voice for narration")}>
                    <Switch
                      checked={s.ai.voiceCloning}
                      onCheckedChange={(v) => s.toggleAi("voiceCloning", v)}
                    />
                  </Setting>
                </Section>
              )}

              {section === "language" && (
                <Section title={t("Language & region")} subtitle={t("Localize the experience.")}>
                  <Setting label={t("Display language")} sub={t("Choose your preferred language")}>
                    <LanguageDropdown
                      value={s.language}
                      onChange={s.setLanguage}
                    />
                  </Setting>
                  <Setting label={t("Auto-translate")} sub={t("Translate incoming messages on tap")}>
                    <Switch checked={s.autoTranslate} onCheckedChange={s.setAutoTranslate} />
                  </Setting>
                  <Setting label={t("Spell check")} sub={t("Underline and autocorrect")}>
                    <Switch checked={s.spellCheck} onCheckedChange={s.setSpellCheck} />
                  </Setting>
                </Section>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <ChatThemeDialog open={chatThemeOpen} onOpenChange={setChatThemeOpen} global />
    </div>
  );
}

/* ───────────── Security score (derived from toggles) ───────────── */
function SecurityScore({
  security
}: {
  security: { twoFactor: boolean; biometric: boolean; loginAlerts: boolean; autoLockVault: boolean };
}) {
  const t = useT();
  const on = Object.values(security).filter(Boolean).length;
  const total = 4;
  const grade = on === 4 ? "A+" : on === 3 ? "A" : on === 2 ? "B" : on === 1 ? "C" : "D";
  const secure = on >= 3;
  return (
    <div className="glass rounded-2xl p-5 mb-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "size-12 rounded-2xl grid place-items-center text-white",
            secure
              ? "bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-glow-cyan"
              : "bg-gradient-to-br from-amber-400 to-rose-500"
          )}
        >
          <Shield />
        </div>
        <div>
          <p className="text-sm font-semibold">
            {secure ? t("Account secure") : t("Review your security")}
          </p>
          <p className="text-xs text-muted-foreground">
            {on} / {total} {t("protections enabled")}
          </p>
        </div>
        <Badge variant={secure ? "success" : "warning"} className="ml-auto">
          <CheckCircle2 className="size-3" /> {grade}
        </Badge>
      </div>
    </div>
  );
}

/* ───────────── Storage (computed from the vault) ───────────── */
function StorageSection() {
  const t = useT();
  const nodes = useVaultStore((st) => st.nodes);
  const QUOTA = 50e9; // 50 GB

  const breakdown = React.useMemo(() => {
    const acc = { media: 0, documents: 0, voice: 0, other: 0 };
    for (const n of nodes) {
      if (n.kind !== "file" || !n.size) continue;
      if (n.fileKind === "image" || n.fileKind === "video") acc.media += n.size;
      else if (n.fileKind === "doc") acc.documents += n.size;
      else if (n.fileKind === "audio") acc.voice += n.size;
      else acc.other += n.size;
    }
    return acc;
  }, [nodes]);

  const used = breakdown.media + breakdown.documents + breakdown.voice + breakdown.other;
  const pct = Math.max(0.5, Math.min(100, (used / QUOTA) * 100));

  const cards = [
    { l: "Media", v: breakdown.media, c: "bg-violet-500" },
    { l: "Documents", v: breakdown.documents, c: "bg-cyan-400" },
    { l: "Voice notes", v: breakdown.voice, c: "bg-pink-500" },
    { l: "Other", v: breakdown.other, c: "bg-amber-400" }
  ];

  return (
    <Section title={t("Storage")} subtitle={t("Manage what's on your device and in the cloud.")}>
      <div className="glass rounded-2xl p-5">
        <p className="text-sm font-semibold mb-3">
          {formatBytes(used)} <span className="text-muted-foreground font-normal">{t("of 50 GB")}</span>
        </p>
        <div className="h-3 rounded-full bg-foreground/10 overflow-hidden flex">
          {cards.map((c) =>
            c.v > 0 ? (
              <div
                key={c.l}
                className={c.c}
                style={{ width: `${(c.v / QUOTA) * 100}%`, minWidth: c.v > 0 ? 2 : 0 }}
              />
            ) : null
          )}
          {used === 0 && (
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-xs">
          {cards.map((x) => (
            <div key={x.l} className="glass-subtle rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${x.c}`} />
                <span>{t(x.l)}</span>
              </div>
              <p className="mt-1 font-semibold">{formatBytes(x.v)}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          {t("Usage reflects files in your vault. Upload more from the Vault page to see it grow.")}
        </p>
      </div>
    </Section>
  );
}

/* ───────────── Language dropdown ───────────── */
function LanguageDropdown({
  value,
  onChange
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const current = LANGUAGES.find((l) => l.code === value) ?? LANGUAGES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-xl glass-subtle pl-2.5 pr-2 py-1.5 text-sm hover:bg-foreground/[0.06] transition">
          <span className="text-lg leading-none">{current.flag}</span>
          <span className="font-medium">{current.label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="!w-auto !min-w-[12rem] max-h-[320px] overflow-y-auto">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => onChange(l.code)}
            className="gap-2.5"
          >
            <span className="text-lg leading-none">{l.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{l.label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{l.native}</p>
            </div>
            {value === l.code && <Check className="size-4 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ───────────── Font dropdown ───────────── */
function FontDropdown({
  value,
  onChange
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const current = FONT_OPTIONS.find((f) => f.id === value) ?? FONT_OPTIONS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-xl glass-subtle pl-3 pr-2 py-1.5 text-sm hover:bg-foreground/[0.06] transition">
          <span className="font-medium" style={{ fontFamily: current.family }}>
            {current.label}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="!w-auto !min-w-[14rem] max-h-[320px] overflow-y-auto">
        {FONT_OPTIONS.map((f) => (
          <DropdownMenuItem
            key={f.id}
            onSelect={() => onChange(f.id)}
            className="gap-2.5"
          >
            <span className="flex-1 text-[15px]" style={{ fontFamily: f.family }}>
              {f.label}
            </span>
            {value === f.id && <Check className="size-4 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Section({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-display font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1">{subtitle}</p>
      <div className="mt-6 space-y-2">{children}</div>
    </motion.div>
  );
}

function Setting({
  label,
  sub,
  children
}: {
  label: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl glass-subtle">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
