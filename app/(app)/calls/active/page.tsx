"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Radio, Sparkles, Timer, ChevronLeft } from "lucide-react";
import { VideoGrid } from "@/features/calls/video-grid";
import { CallControls } from "@/features/calls/call-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { callParticipants } from "@/lib/mock-data";
import { useUIStore } from "@/store/use-ui-store";

function Timer01() {
  const [s, setS] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return (
    <span className="font-mono text-xs tabular-nums">
      00:{mm}:{ss}
    </span>
  );
}

export default function ActiveCall() {
  const router = useRouter();
  const activeCall = useUIStore((s) => s.activeCall);
  const startCall = useUIStore((s) => s.startCall);
  const endCall = useUIStore((s) => s.endCall);

  // If someone lands on /calls/active without an active call (e.g. deep link),
  // create a demo call so the page renders meaningfully.
  React.useEffect(() => {
    if (!activeCall) {
      startCall({
        chatId: "c1",
        name: "Kai Nakamura",
        avatar: "https://api.dicebear.com/9.x/notionists/svg?backgroundType=gradientLinear&backgroundColor=8b5cf6,ec4899,22d3ee,a3e635,fbbf24,fb923c,60a5fa,f472b6&radius=18&seed=kai",
        video: true
      });
    }
  }, [activeCall, startCall]);

  return (
    <div className="relative h-[calc(100dvh-4rem)] overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 aurora-bg opacity-50" />
      </div>

      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <Button
          variant="glass"
          size="sm"
          onClick={() => router.push("/chats")}
          title="Minimize — the call keeps running"
        >
          <ChevronLeft /> Minimize
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 glass-strong rounded-full px-4 py-1.5 border border-border/60"
        >
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-medium">LIVE</span>
          </div>
          <span className="text-muted-foreground/60">·</span>
          <Timer01 />
          <span className="text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Lock className="size-3 text-emerald-400" /> Encrypted
          </span>
        </motion.div>

        <div className="flex items-center gap-2">
          <Badge variant="cyan" className="hidden md:inline-flex">
            <Sparkles className="size-3" /> AI noise cancel · on
          </Badge>
          <Badge variant="success">
            <Radio className="size-3" /> 320 kbps
          </Badge>
        </div>
      </div>

      <div className="flex-1 px-3 md:px-6 pb-32 h-[calc(100%-180px)]">
        <VideoGrid participants={callParticipants} />
      </div>

      <div className="absolute bottom-6 left-0 right-0 grid place-items-center">
        <CallControls
          onEnd={() => {
            endCall();
            router.push("/calls");
          }}
        />
      </div>
    </div>
  );
}
