"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const EMOJIS = ["❤️", "🔥", "😂", "👏", "🤯", "🙌", "💜", "🥲", "🎉", "👀", "🤝", "✨"];

interface Props {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onPick: (emoji: string) => void;
  children: React.ReactNode;
}

export function ReactionPicker({ open, onOpenChange, onPick, children }: Props) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="!p-2 !w-auto">
        <div className="grid grid-cols-6 gap-1">
          {EMOJIS.map((e, i) => (
            <motion.button
              key={e}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              whileHover={{ scale: 1.3, y: -2 }}
              onClick={() => onPick(e)}
              className="size-8 grid place-items-center text-lg rounded-lg hover:bg-foreground/5"
            >
              {e}
            </motion.button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
