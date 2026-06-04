"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import { useChatStore } from "@/store/use-chat-store";
import { useAuthStore } from "@/store/use-auth-store";

/**
 *  MentionPicker — WhatsApp/Slack-style "@" autocomplete for chat
 *  composers. Pops above the textarea as soon as the user types `@`
 *  and shows a filtered list of the group's members. Click (or press
 *  Enter) on a row → the consumer's `onPick` callback fires with the
 *  full user record, and the composer replaces the typed query with
 *  `@username` (plus a trailing space).
 *
 *  Design notes:
 *    • Always opens UPWARDS (`bottom-full`) — the textarea sits at the
 *      bottom of the screen and a downward popover would clip the
 *      keyboard on mobile.
 *    • Only renders when `open` is true AND the group has at least one
 *      member that matches the query — so an empty group or a
 *      no-match query collapses silently.
 *    • DMs don't trigger this — the consumer (`MessageInput`) gates
 *      the open state on `chat.type !== "dm"`.
 *    • Keyboard nav: ↑/↓ to move, Enter/Tab to pick, Esc to dismiss.
 *      The consumer wires these through `onKeyDown` so they intercept
 *      BEFORE the textarea's Enter-to-send handler runs.
 */

export interface MentionablePerson {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

interface Props {
  open: boolean;
  /** Substring after the `@` the user has typed so far (lowercase). */
  query: string;
  /** Group members the picker can choose from. The consumer derives this
   *  from `chat.memberIds` + the profile cache. The picker does its own
   *  case-insensitive filter against name + username. */
  members: MentionablePerson[];
  /** Highlight index — owned by the consumer so kbd nav can move it
   *  without re-mounting this component. */
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  onPick: (person: MentionablePerson) => void;
  onClose: () => void;
}

export function MentionPicker({
  open,
  query,
  members,
  activeIndex,
  setActiveIndex,
  onPick,
  onClose
}: Props) {
  const meId = useAuthStore((s) => s.user?.id);
  // Pre-filter: drop the current user (you can't mention yourself) +
  // narrow by query against name/username/initials. Slice to top 8 so
  // the popover doesn't dominate the screen.
  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return members
      .filter((m) => m.id !== meId)
      .filter((m) => {
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [members, query, meId]);

  // When the filtered list shrinks past the current activeIndex, snap
  // it back to 0 so Enter doesn't try to pick a non-existent row.
  React.useEffect(() => {
    if (activeIndex >= filtered.length && filtered.length > 0) {
      setActiveIndex(0);
    }
  }, [filtered.length, activeIndex, setActiveIndex]);

  if (!open) return null;
  if (filtered.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        // `bottom-full mb-2` anchors UP from the textarea — the consumer
        // wraps us in a relative parent so absolute positioning lands
        // above their input.
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.12 }}
        className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-2xl glass-strong glass-specular border border-white/15 shadow-floating overflow-hidden max-h-72 overflow-y-auto"
        // Mouse-down BEFORE the textarea's blur fires — keeps the popup
        // alive while the user clicks a row.
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/10">
          Mention someone
        </div>
        <ul role="listbox" aria-label="Mentionable members">
          {filtered.map((p, idx) => {
            const isActive = idx === activeIndex;
            return (
              <li key={p.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onPick(p);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition",
                    isActive
                      ? "bg-foreground/[0.08]"
                      : "hover:bg-foreground/[0.05]"
                  )}
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={p.avatar} alt={p.name} />
                    <AvatarFallback>{initials(p.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      @{p.username}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}
