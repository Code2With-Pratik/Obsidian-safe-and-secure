"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  MousePointer2,
  Pen,
  Square,
  Circle,
  Type,
  Image as ImageIcon,
  StickyNote,
  Eraser,
  Undo2,
  Redo2,
  Share2,
  Users,
  Sparkles,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { users } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tools = [
  { icon: <MousePointer2 />, label: "Select" },
  { icon: <Pen />, label: "Pen" },
  { icon: <Eraser />, label: "Eraser" },
  { icon: <Square />, label: "Square" },
  { icon: <Circle />, label: "Circle" },
  { icon: <Type />, label: "Text" },
  { icon: <StickyNote />, label: "Sticky" },
  { icon: <ImageIcon />, label: "Image" }
];

const notes = [
  { x: 12, y: 18, color: "from-amber-300 to-amber-400", text: "Hero: 'The future of communication'", rot: -3 },
  { x: 32, y: 30, color: "from-pink-300 to-pink-400", text: "Use aurora gradient bg on splash", rot: 2 },
  { x: 58, y: 16, color: "from-cyan-300 to-cyan-400", text: "Ghost rooms = killer feature", rot: -1 },
  { x: 72, y: 42, color: "from-violet-300 to-violet-400", text: "Whiteboard inside calls?", rot: 4 },
  { x: 18, y: 60, color: "from-emerald-300 to-emerald-400", text: "Brainstorm mode → AI clusters ideas", rot: -2 },
  { x: 48, y: 64, color: "from-rose-300 to-rose-400", text: "Stickers as DND-able layers", rot: 3 }
];

const cursors = [
  { x: 28, y: 32, name: "Kai", color: "#22D3EE" },
  { x: 64, y: 50, name: "Iris", color: "#EC4899" },
  { x: 40, y: 70, name: "Nova", color: "#A3E635" }
];

export default function WhiteboardPage() {
  const [active, setActive] = React.useState("Pen");

  return (
    <div className="h-[calc(100dvh-4rem)] relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--border) / 0.6) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/50" />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 glass-strong rounded-2xl px-2 py-1.5 border border-border/60 shadow-floating">
        {tools.map((t) => (
          <Tooltip key={t.label}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActive(t.label)}
                className={cn(
                  "size-9 grid place-items-center rounded-xl transition [&_svg]:size-4",
                  active === t.label
                    ? "bg-foreground text-background"
                    : "hover:bg-foreground/5"
                )}
              >
                {t.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent>{t.label}</TooltipContent>
          </Tooltip>
        ))}
        <div className="w-px h-6 bg-border/60 mx-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="size-9 grid place-items-center rounded-xl hover:bg-foreground/5">
              <Undo2 className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="size-9 grid place-items-center rounded-xl hover:bg-foreground/5">
              <Redo2 className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 glass rounded-full px-3 py-1.5">
          <Users className="size-3.5 text-muted-foreground" />
          <div className="flex -space-x-2">
            {users.slice(1, 5).map((u) => (
              <Avatar key={u.id} className="size-6 ring-2 ring-background">
                <AvatarImage src={u.avatar} />
              </Avatar>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">4 editing</span>
        </div>
        <Button variant="glass" size="sm">
          <Brain /> Brainstorm
        </Button>
        <Button variant="gradient" size="sm">
          <Share2 /> Share
        </Button>
      </div>

      <div className="absolute inset-0 pt-20">
        {notes.map((n, i) => (
          <motion.div
            key={i}
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.5, rotate: n.rot }}
            animate={{ opacity: 1, scale: 1, rotate: n.rot }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.05, zIndex: 10 }}
            style={{
              left: `${n.x}%`,
              top: `${n.y}%`
            }}
            className={`absolute w-44 h-44 rounded-2xl bg-gradient-to-br ${n.color} p-4 shadow-floating cursor-grab active:cursor-grabbing text-slate-900`}
          >
            <p className="text-sm font-medium leading-snug">{n.text}</p>
            <div className="absolute bottom-2 right-2 text-[10px] opacity-70">
              {users[i % users.length]?.name.split(" ")[0]}
            </div>
          </motion.div>
        ))}

        {cursors.map((c, i) => (
          <motion.div
            key={i}
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: [0, 12, -8, 0], y: [0, -10, 6, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity }}
            className="absolute pointer-events-none flex items-center gap-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill={c.color}>
              <path d="M4 1l13 8-6 1-3 6-4-15z" />
            </svg>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 glass-strong rounded-full px-4 py-2 border border-border/60 shadow-floating inline-flex items-center gap-3 text-xs"
      >
        <Sparkles className="size-3.5 text-violet-400" />
        <span>AI cluster · 6 notes grouped by theme</span>
        <Badge variant="cyan">Apply</Badge>
      </motion.div>
    </div>
  );
}
