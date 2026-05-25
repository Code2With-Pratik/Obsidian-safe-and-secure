"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneCall,
  Users,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { users } from "@/lib/mock-data";

const history = [
  { id: "h1", user: users[1], kind: "outgoing", duration: "12:04", time: "9:42 AM", video: true },
  { id: "h2", user: users[2], kind: "incoming", duration: "04:21", time: "Yesterday", video: false },
  { id: "h3", user: users[6], kind: "missed", duration: "—", time: "Yesterday" },
  { id: "h4", user: users[4], kind: "outgoing", duration: "00:58", time: "2 days ago", video: true },
  { id: "h5", user: users[3], kind: "incoming", duration: "26:33", time: "3 days ago" }
] as const;

const kindIcon = {
  incoming: <PhoneIncoming className="size-3.5 text-emerald-400" />,
  outgoing: <PhoneOutgoing className="size-3.5 text-cyan-400" />,
  missed: <PhoneMissed className="size-3.5 text-rose-400" />
};

export default function CallsPage() {
  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            Calls & <span className="neon-text">meetings</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Crystal-clear voice and video. AI noise cancellation, live captions, and floating mini calls — all built in.
          </p>
        </motion.div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-8">
          <Link href="/calls/active">
            <ActionTile
              icon={<Video />}
              title="Start a meeting"
              subtitle="Open instant room"
              gradient="from-violet-500 to-fuchsia-500"
              cta
            />
          </Link>
          <ActionTile
            icon={<Phone />}
            title="New voice call"
            subtitle="One-on-one"
            gradient="from-emerald-400 to-cyan-400"
          />
          <ActionTile
            icon={<Users />}
            title="Group call"
            subtitle="Invite up to 50"
            gradient="from-cyan-400 to-blue-500"
          />
          <ActionTile
            icon={<Sparkles />}
            title="Schedule"
            subtitle="Plan with your circle"
            gradient="from-amber-400 to-pink-500"
          />
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Recent calls</h2>
              <Button variant="ghost" size="sm">View all</Button>
            </div>
            <div className="space-y-1">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-foreground/[0.04] transition"
                >
                  <Avatar className="size-10">
                    <AvatarImage src={h.user.avatar} />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{h.user.name}</span>
                      {kindIcon[h.kind]}
                      {"video" in h && h.video && (
                        <Video className="size-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{h.time} · {h.duration}</div>
                  </div>
                  <Button variant="ghost" size="icon-sm">
                    <PhoneCall className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm">
                    <Video className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
            <div className="space-y-3">
              {[
                { t: "Helios design review", at: "Today · 4:00 PM", c: 6 },
                { t: "Founders sync", at: "Tomorrow · 10:00 AM", c: 3 },
                { t: "Nova launch retro", at: "Fri · 2:30 PM", c: 12 }
              ].map((m) => (
                <div key={m.t} className="glass-subtle rounded-xl p-3">
                  <div className="text-sm font-medium">{m.t}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{m.at}</div>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex -space-x-2">
                      {Array.from({ length: Math.min(4, m.c) }).map((_, i) => (
                        <div
                          key={i}
                          className="size-6 rounded-full bg-foreground/10 ring-2 ring-background"
                        />
                      ))}
                      {m.c > 4 && (
                        <div className="size-6 rounded-full bg-foreground/5 ring-2 ring-background grid place-items-center text-[9px]">
                          +{m.c - 4}
                        </div>
                      )}
                    </div>
                    <Badge variant="cyan">Join</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

function ActionTile({
  icon,
  title,
  subtitle,
  gradient,
  cta
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
  cta?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-3xl glass border border-border/60 p-5 cursor-pointer"
    >
      <div className={`size-12 rounded-2xl bg-gradient-to-br ${gradient} grid place-items-center text-white shadow-glow`}>
        {icon}
      </div>
      <h3 className="font-semibold mt-3.5">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      {cta && (
        <Badge variant="default" className="absolute top-4 right-4">
          New
        </Badge>
      )}
    </motion.div>
  );
}
