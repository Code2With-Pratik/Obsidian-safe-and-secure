"use client";

import * as React from "react";
import { ChatList } from "@/features/chat/chat-list";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function ChatsIndex() {
  return (
    <div className="flex h-[calc(100dvh-4rem)]">
      <div className="w-full md:w-[400px] lg:w-[420px] shrink-0 md:border-r border-border/40 bg-card/30 backdrop-blur-xl">
        <ChatList />
      </div>
      <div className="hidden md:grid place-items-center flex-1 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md px-6"
        >
          <motion.div
            className="size-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center shadow-glow"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Sparkles className="size-8 text-white" />
          </motion.div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">
            Select a conversation
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or start a new one. Nova chats are private by default and encrypted edge to edge.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" /> 6 online
            </span>
            <span>·</span>
            <span>2 unread threads</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
