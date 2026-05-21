"use client";

import * as React from "react";
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
  ChevronRight,
  Laptop,
  Tablet
} from "lucide-react";
import { useTheme } from "next-themes";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const accents = [
  { id: "violet", color: "#8B5CF6", name: "Aurora Violet" },
  { id: "cyan", color: "#22D3EE", name: "Neon Cyan" },
  { id: "pink", color: "#EC4899", name: "Synth Pink" },
  { id: "lime", color: "#A3E635", name: "Voltage Lime" },
  { id: "amber", color: "#FBBF24", name: "Solar Amber" }
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [section, setSection] = React.useState("appearance");
  const [accent, setAccent] = React.useState("violet");
  const [glass, setGlass] = React.useState([80]);

  return (
    <div className="flex h-[calc(100dvh-4rem)]">
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border/40 bg-card/30 backdrop-blur-xl flex-col">
        <div className="p-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">Settings</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Tune Nova to feel like yours.
          </p>
        </div>
        <ScrollArea className="flex-1 px-3 pb-3">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                section === s.id
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
              )}
            >
              <s.icon className="size-4" />
              {s.label}
              {section === s.id && <ChevronRight className="size-3 ml-auto" />}
            </button>
          ))}
        </ScrollArea>
      </aside>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
          {section === "appearance" && (
            <Section title="Appearance" subtitle="Make Nova feel like home.">
              <Setting label="Theme" sub="Light, dark, or follow system.">
                <div className="flex gap-1.5 p-1 rounded-xl glass-subtle">
                  {[
                    { id: "light", icon: <Sun className="size-3.5" /> },
                    { id: "dark", icon: <Moon className="size-3.5" /> },
                    { id: "system", icon: <Monitor className="size-3.5" /> }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs capitalize transition inline-flex items-center gap-1.5",
                        theme === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.icon}
                      {t.id}
                    </button>
                  ))}
                </div>
              </Setting>

              <Setting label="Accent color" sub="Used across highlights, links, and AI glow.">
                <div className="flex gap-2">
                  {accents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAccent(a.id)}
                      className={cn(
                        "size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition",
                        accent === a.id ? "ring-foreground" : "ring-transparent"
                      )}
                      style={{ background: a.color }}
                    />
                  ))}
                </div>
              </Setting>

              <Setting label="Glass intensity" sub="Backdrop blur in surfaces.">
                <Slider value={glass} onValueChange={setGlass} min={0} max={100} step={5} className="w-40" />
              </Setting>

              <Setting label="Reduce motion" sub="Disable parallax and float animations.">
                <Switch />
              </Setting>
            </Section>
          )}

          {section === "notifications" && (
            <Section title="Notifications" subtitle="Who gets to interrupt you.">
              <Setting label="Direct messages" sub="Mentions, DMs, replies"><Switch defaultChecked /></Setting>
              <Setting label="Group chats" sub="Only highlights"><Switch defaultChecked /></Setting>
              <Setting label="Ghost rooms" sub="Anonymous activity"><Switch /></Setting>
              <Setting label="Call invitations" sub="Ringtones and banner alerts"><Switch defaultChecked /></Setting>
              <Setting label="Sounds" sub="Subtle haptics and audio cues"><Switch defaultChecked /></Setting>
            </Section>
          )}

          {section === "privacy" && (
            <Section title="Privacy" subtitle="Default deny. Choose what to allow.">
              <Setting label="Read receipts" sub="Let others know when you've read"><Switch defaultChecked /></Setting>
              <Setting label="Typing indicator" sub="Show three dots while typing"><Switch defaultChecked /></Setting>
              <Setting label="Last seen" sub="Friends only"><Switch /></Setting>
              <Setting label="Profile photo" sub="Visible to: everyone"><Switch defaultChecked /></Setting>
              <Setting label="Allow screenshots in chats" sub="Block by default"><Switch /></Setting>
            </Section>
          )}

          {section === "security" && (
            <Section title="Security dashboard" subtitle="Your account passport.">
              <div className="glass rounded-2xl p-5 mb-3">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 grid place-items-center shadow-glow-cyan">
                    <Shield className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Account secure</p>
                    <p className="text-xs text-muted-foreground">
                      All checks passing · last reviewed today
                    </p>
                  </div>
                  <Badge variant="success" className="ml-auto">
                    <CheckCircle2 className="size-3" /> A+
                  </Badge>
                </div>
              </div>
              <Setting label="Two-factor authentication" sub="App + backup codes"><Switch defaultChecked /></Setting>
              <Setting label="Biometric unlock" sub="Use Face ID or Windows Hello"><Switch defaultChecked /></Setting>
              <Setting label="Login alerts" sub="Email me when something signs in"><Switch defaultChecked /></Setting>
              <Setting label="Auto-lock vault" sub="After 5 minutes of inactivity"><Switch defaultChecked /></Setting>
            </Section>
          )}

          {section === "devices" && (
            <Section title="Devices" subtitle="Where Nova is currently active.">
              {[
                { icon: <Laptop />, name: "MacBook Pro · this device", loc: "Lisbon, PT", time: "Active now" },
                { icon: <Smartphone />, name: "iPhone 17 Pro", loc: "Lisbon, PT", time: "2 min ago" },
                { icon: <Tablet />, name: "iPad Air", loc: "Lisbon, PT", time: "Yesterday" },
                { icon: <Monitor />, name: "Studio Display", loc: "Office", time: "3 days ago" }
              ].map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass-subtle mt-2">
                  <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center [&_svg]:size-4">{d.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">{d.loc} · {d.time}</p>
                  </div>
                  <Button variant="ghost" size="sm">Sign out</Button>
                </div>
              ))}
            </Section>
          )}

          {section === "storage" && (
            <Section title="Storage" subtitle="Manage what's on your device and in the cloud.">
              <div className="glass rounded-2xl p-5">
                <p className="text-sm font-semibold mb-3">17.8 GB of 50 GB</p>
                <div className="h-3 rounded-full bg-foreground/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" style={{ width: "36%" }} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-xs">
                  {[
                    { l: "Media", v: "9.2 GB", c: "bg-violet-500" },
                    { l: "Documents", v: "2.4 GB", c: "bg-cyan-400" },
                    { l: "Voice notes", v: "1.8 GB", c: "bg-pink-500" },
                    { l: "Caches", v: "4.4 GB", c: "bg-amber-400" }
                  ].map((x) => (
                    <div key={x.l} className="glass-subtle rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <span className={`size-2.5 rounded-full ${x.c}`} />
                        <span>{x.l}</span>
                      </div>
                      <p className="mt-1 font-semibold">{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {section === "ai" && (
            <Section title="AI settings" subtitle="Tune Nova's intelligence to your taste.">
              <Setting label="On-device suggestions" sub="Smart replies and message drafts"><Switch defaultChecked /></Setting>
              <Setting label="Cloud assist" sub="Summaries, translations, generations"><Switch defaultChecked /></Setting>
              <Setting label="Read my conversations" sub="Required for chat-aware AI"><Switch /></Setting>
              <Setting label="Voice cloning" sub="Allow Nova to mimic your voice for narration"><Switch /></Setting>
            </Section>
          )}

          {section === "language" && (
            <Section title="Language & region" subtitle="Localize the experience.">
              <Setting label="Display language" sub="English (US)"><Button variant="glass" size="sm">Change</Button></Setting>
              <Setting label="Auto-translate" sub="Translate incoming messages on tap"><Switch defaultChecked /></Setting>
              <Setting label="Spell check" sub="Underline and autocorrect"><Switch defaultChecked /></Setting>
            </Section>
          )}
        </div>
      </ScrollArea>
    </div>
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
