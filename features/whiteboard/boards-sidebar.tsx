"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";
import { useT } from "@/lib/i18n";

export function BoardsSidebar({
  collapsed,
  onToggleCollapsed
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const t = useT();
  const boards = useWhiteboardStore((s) => s.boards);
  const activeBoardId = useWhiteboardStore((s) => s.activeBoardId);
  const createBoard = useWhiteboardStore((s) => s.createBoard);
  const renameBoard = useWhiteboardStore((s) => s.renameBoard);
  const deleteBoard = useWhiteboardStore((s) => s.deleteBoard);
  const setActiveBoard = useWhiteboardStore((s) => s.setActiveBoard);

  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 240 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className="shrink-0 h-full border-r border-border/40 bg-card/40 backdrop-blur-xl flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 h-12 border-b border-border/40 shrink-0">
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("Whiteboards")}
          </p>
        )}
        <button
          onClick={onToggleCollapsed}
          className={cn(
            "size-8 grid place-items-center rounded-md hover:bg-foreground/10 text-muted-foreground",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? t("Expand boards") : t("Collapse boards")}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2 space-y-0.5">
        <button
          onClick={() => {
            const b = createBoard(
              `Board ${useWhiteboardStore.getState().boards.length + 1}`
            );
            setEditingId(b.id);
          }}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 mb-1.5 rounded-xl text-xs font-medium transition",
            "bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-glow hover:brightness-110",
            collapsed ? "h-10" : "h-9"
          )}
          aria-label={t("New board")}
        >
          <Plus className="size-4" />
          {!collapsed && t("New board")}
        </button>
        {boards.map((b) => {
          const active = b.id === activeBoardId;
          const isEditing = editingId === b.id;
          if (collapsed) {
            // Compact view: just a colored chip per board.
            return (
              <button
                key={b.id}
                onClick={() => setActiveBoard(b.id)}
                title={b.name}
                className={cn(
                  "w-10 h-10 mx-auto grid place-items-center rounded-lg text-xs font-semibold transition",
                  active
                    ? "bg-foreground text-background"
                    : "bg-foreground/10 text-muted-foreground hover:bg-foreground/15"
                )}
              >
                {b.name.charAt(0).toUpperCase()}
              </button>
            );
          }
          return (
            <div
              key={b.id}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-lg group transition",
                active ? "bg-foreground/10" : "hover:bg-foreground/[0.04]"
              )}
            >
              <button
                onClick={() => setActiveBoard(b.id)}
                className="flex-1 min-w-0 text-left flex items-center gap-2"
              >
                <span
                  className={cn(
                    "size-6 rounded-md grid place-items-center text-[10px] font-semibold shrink-0",
                    active ? "bg-foreground text-background" : "bg-foreground/10"
                  )}
                >
                  {b.name.charAt(0).toUpperCase()}
                </span>
                {isEditing ? (
                  <input
                    autoFocus
                    defaultValue={b.name}
                    onBlur={(e) => {
                      renameBoard(b.id, e.target.value);
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="bg-transparent outline-none text-[13px] flex-1 min-w-0 border-b border-foreground/30 px-0.5"
                  />
                ) : (
                  <span className="text-[13px] font-medium truncate">{b.name}</span>
                )}
                {active && !isEditing && (
                  <Check className="size-3 text-cyan-400 shrink-0" />
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="size-7 grid place-items-center rounded-md hover:bg-foreground/10 text-foreground opacity-0 group-hover:opacity-100 transition outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:opacity-100 data-[state=open]:ring-0"
                    aria-label={t("Board options")}
                  >
                    <MoreVertical className="size-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="!w-40">
                  <DropdownMenuItem onSelect={() => setEditingId(b.id)}>
                    <Pencil />
                    {t("Rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => deleteBoard(b.id)}
                    className="!text-rose-400 focus:!text-rose-300"
                  >
                    <Trash2 />
                    {t("Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

    </motion.aside>
  );
}
