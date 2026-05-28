"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Folder,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  Archive,
  Search,
  Lock,
  Unlock,
  Star,
  Share2,
  MoreHorizontal,
  ChevronRight,
  Home,
  Trash2,
  ShieldCheck,
  LayoutGrid,
  List,
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useVaultStore, type VaultNode, type VaultFileKind } from "@/store/use-vault-store";
import { NewFolderDialog, VaultPasswordDialog } from "@/features/vault/vault-dialogs";
import { FilePreviewDialog } from "@/features/vault/file-preview-dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const iconFor: Record<VaultFileKind, React.ReactNode> = {
  image: <FileImage />,
  video: <FileVideo />,
  audio: <FileAudio />,
  doc: <FileText />,
  archive: <Archive />,
  code: <FileCode />,
  other: <File />
};

function formatBytes(b?: number) {
  if (b == null) return "";
  if (b > 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b > 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b > 1e3) return (b / 1e3).toFixed(0) + " KB";
  return b + " B";
}

/** Shorten a long file name while preserving its extension, e.g.
 *  "my-very-long-report-final.pdf" → "my-very-long-re….pdf". Folders and
 *  extension-less names are simply clipped with an ellipsis. */
function truncateName(name: string, max: number): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  // Treat as having an extension only if the dot is near the end (≤6 chars).
  if (dot > 0 && name.length - dot <= 6) {
    const ext = name.slice(dot); // includes the dot, e.g. ".pdf"
    const keep = Math.max(1, max - ext.length - 1);
    return name.slice(0, keep) + "…" + ext;
  }
  return name.slice(0, Math.max(1, max - 1)) + "…";
}

export default function FilesPage() {
  const t = useT();
  /* ---- state ---- */
  const nodes = useVaultStore((s) => s.nodes);
  const byParent = useVaultStore((s) => s.byParent);
  const pathTo = useVaultStore((s) => s.pathTo);
  const addFiles = useVaultStore((s) => s.addFiles);
  const createFolder = useVaultStore((s) => s.createFolder);
  const toggleStar = useVaultStore((s) => s.toggleStar);
  const toggleVault = useVaultStore((s) => s.toggleVault);
  const remove = useVaultStore((s) => s.remove);
  const password = useVaultStore((s) => s.password);
  const unlocked = useVaultStore((s) => s.unlocked);
  const setVaultPassword = useVaultStore((s) => s.setVaultPassword);
  const unlock = useVaultStore((s) => s.unlock);
  const lock = useVaultStore((s) => s.lock);
  const changePassword = useVaultStore((s) => s.changePassword);

  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("all");
  const [q, setQ] = React.useState("");
  /** Icon grid (Finder-style) vs. compact list view. */
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [drag, setDrag] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [pwOpen, setPwOpen] = React.useState(false);
  /** Which password flow the dialog is currently in. Reset on close. */
  const [pwMode, setPwMode] = React.useState<"set" | "unlock" | "change">("set");
  /** Preview-dialog state: list of files navigable in the dialog + the
   *  index of the one the user clicked. `startIndex === null` = closed. */
  const [preview, setPreview] = React.useState<{
    items: VaultNode[];
    startIndex: number | null;
  }>({ items: [], startIndex: null });
  /** Action queued behind the password prompt — fires only after a successful unlock. */
  const pendingActionRef = React.useRef<(() => void) | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /* ---- multi-select ---- */
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const selectionActive = selected.size > 0;
  const toggleSelect = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = React.useCallback(() => setSelected(new Set()), []);
  /** Replace the whole selection (used by marquee drag-select + select-all). */
  const replaceSelection = React.useCallback(
    (ids: string[]) => setSelected(new Set(ids)),
    []
  );

  /* ---- bulk actions on the current selection ---- */
  const bulkStar = React.useCallback(() => {
    const all = useVaultStore.getState().nodes;
    selected.forEach((id) => {
      const n = all.find((x) => x.id === id);
      if (n && !n.starred) toggleStar(id);
    });
  }, [selected, toggleStar]);

  const bulkDelete = React.useCallback(() => {
    selected.forEach((id) => remove(id));
    clearSelection();
  }, [selected, remove, clearSelection]);

  /** Run `fn` if the node is accessible. If it's a vault item and the
   *  vault is still locked, queue the action behind the password dialog. */
  const accessNode = React.useCallback(
    (node: VaultNode, fn: () => void) => {
      if (node.vault && !unlocked) {
        pendingActionRef.current = fn;
        // Will use "unlock" automatically since a password exists when
        // there are vault items (we don't allow vault flag without one).
        setPwMode(password ? "unlock" : "set");
        setPwOpen(true);
        return;
      }
      fn();
    },
    [unlocked, password]
  );

  /** Open the password dialog in the right mode. Auto-detects "set" vs
   *  "unlock"; pass "change" explicitly. */
  const openPwDialog = React.useCallback(
    (mode?: "set" | "unlock" | "change") => {
      const next = mode ?? (password ? "unlock" : "set");
      setPwMode(next);
      setPwOpen(true);
    },
    [password]
  );

  /** Same idea for actions that aren't tied to a specific node — used by the
   *  "Move to vault" menu when no password is set yet. */
  const requirePassword = React.useCallback(
    (after?: () => void) => {
      if (after) pendingActionRef.current = after;
      openPwDialog();
    },
    [openPwDialog]
  );

  /** True when every selected item already lives in the vault — flips the
   *  bulk button between "Move to vault" and "Remove from vault". */
  const allSelectedVaulted = React.useMemo(() => {
    if (selected.size === 0) return false;
    return nodes.filter((n) => selected.has(n.id)).every((n) => n.vault);
  }, [selected, nodes]);

  /** Toggle the whole selection in/out of the vault. If they're all already
   *  vaulted, remove them; otherwise move the un-vaulted ones in (prompting
   *  to set a password first if there isn't one yet). */
  const bulkVault = React.useCallback(() => {
    const all = useVaultStore.getState().nodes;
    const sel = all.filter((n) => selected.has(n.id));
    const everyVaulted = sel.length > 0 && sel.every((n) => n.vault);
    if (everyVaulted) {
      sel.forEach((n) => {
        if (n.vault) toggleVault(n.id);
      });
      clearSelection();
      return;
    }
    const doMove = () => {
      sel.forEach((n) => {
        if (!n.vault) toggleVault(n.id);
      });
      clearSelection();
    };
    if (!password) {
      requirePassword(doMove);
      return;
    }
    doMove();
  }, [selected, password, toggleVault, requirePassword, clearSelection]);

  /** Open the preview dialog at `node`. The navigable list = every FILE
   *  currently visible (folders excluded) — so the user can swipe through
   *  every image/video/etc. in the current view. */
  const openPreview = React.useCallback((node: VaultNode, all: VaultNode[]) => {
    const files = all.filter((n) => n.kind === "file");
    const idx = files.findIndex((n) => n.id === node.id);
    setPreview({ items: files, startIndex: Math.max(0, idx) });
  }, []);

  /* ---- derived ---- */
  const breadcrumb = pathTo(currentFolderId);

  /** Pick the right slice of nodes for the current tab. */
  const visibleNodes = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matchesQ = (n: VaultNode) => !needle || n.name.toLowerCase().includes(needle);

    if (tab === "vault") {
      // Vault tab — only visible once unlocked. Supports the same folder
      // navigation as All files, but starts at the root and only includes
      // vault-flagged children at each level (plus their descendants once
      // you drill into them).
      if (!unlocked) return [];
      // At the root of the vault tab show every vault-flagged top-level
      // node. Inside a folder show everything in that folder (the parent
      // being a vault item implies its contents are protected too).
      if (currentFolderId == null) {
        return nodes.filter((n) => n.parentId === null && n.vault).filter(matchesQ);
      }
      return byParent(currentFolderId).filter(matchesQ);
    }
    if (tab === "starred") {
      // Show every starred item — locked ones are still listed with a
      // badge and prompt for the password when clicked.
      return nodes.filter((n) => n.starred).filter(matchesQ);
    }
    // "all" — show contents of the current folder (including locked items
    // so you can see them with a 🔒 badge; clicking will prompt the password).
    return byParent(currentFolderId).filter(matchesQ);
  }, [tab, nodes, byParent, currentFolderId, q]);

  /** Switching tabs resets the folder cursor (All + Vault share it, so a
   *  stale folder id would otherwise hide the vault's root items) and drops
   *  the current selection. Switching *to* the locked Vault tab also pops the
   *  password dialog — but only here, so locking while already on the Vault
   *  tab doesn't immediately re-prompt. */
  const handleTabChange = React.useCallback(
    (next: string) => {
      setTab(next);
      setCurrentFolderId(null);
      clearSelection();
      if (next === "vault" && !unlocked) {
        setPwMode(password ? "unlock" : "set");
        setPwOpen(true);
      }
    },
    [clearSelection, unlocked, password]
  );

  /* ---- drag and drop ---- */
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (dropped.length === 0) return;
    await addFiles(dropped, currentFolderId);
  };

  const onUploadClick = () => fileInputRef.current?.click();

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    await addFiles(picked, currentFolderId);
    e.target.value = "";
  };

  /* ---- vault tab gating ---- */
  const requestVaultAccess = () => {
    // First time? → set password. Otherwise → unlock.
    openPwDialog();
  };

  // Total bytes (across files, ignoring vault items the user can't see yet).
  const usedBytes = React.useMemo(
    () =>
      nodes
        .filter((n) => n.kind === "file" && (!n.vault || unlocked))
        .reduce((a, n) => a + (n.size ?? 0), 0),
    [nodes, unlocked]
  );

  /** Select-all toggle over the currently-visible nodes. */
  const allVisibleSelected =
    visibleNodes.length > 0 && visibleNodes.every((n) => selected.has(n.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) clearSelection();
    else setSelected(new Set(visibleNodes.map((n) => n.id)));
  };

  /** Right-aligned action buttons shown next to the path when items are
   *  selected. Reused across tabs. stopPropagation so clicking an action
   *  doesn't bubble up to the click-outside-clears handler. */
  const selectionActions = selectionActive ? (
    <div
      className="ml-auto flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={toggleSelectAll}
        title={allVisibleSelected ? t("Deselect all") : t("Select all")}
        aria-label={allVisibleSelected ? t("Deselect all") : t("Select all")}
        className={cn(
          "size-8 grid place-items-center rounded-full transition mr-0.5",
          allVisibleSelected
            ? "text-cyan-400 bg-cyan-400/15"
            : "text-muted-foreground hover:text-foreground hover:bg-foreground/10"
        )}
      >
        <CheckCheck className="size-4" />
      </button>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums mr-1 shrink-0">
        <span className="size-1.5 rounded-full bg-cyan-400" />
        {selected.size} {t("selected")}
      </span>

      {/* Desktop: full inline action buttons. */}
      <div className="hidden md:flex items-center gap-1">
        <button
          onClick={bulkStar}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium glass-subtle hover:bg-foreground/10 transition"
        >
          <Star className="size-3.5" /> {t("Star")}
        </button>
        <button
          onClick={bulkVault}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium glass-subtle hover:bg-foreground/10 transition"
        >
          {allSelectedVaulted ? (
            <>
              <Unlock className="size-3.5" /> {t("Remove from vault")}
            </>
          ) : (
            <>
              <Lock className="size-3.5" /> {t("Move to vault")}
            </>
          )}
        </button>
        <button
          onClick={bulkDelete}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-rose-300 hover:bg-rose-500/15 transition"
        >
          <Trash2 className="size-3.5" /> {t("Delete")}
        </button>
      </div>

      {/* Mobile: collapse the actions into a three-dots overflow menu. */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={t("Selection actions")}
              className="size-8 grid place-items-center rounded-full glass-subtle hover:bg-foreground/10 transition"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="!w-auto !min-w-[10rem]">
            <DropdownMenuItem onSelect={bulkStar}>
              <Star /> {t("Star")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={bulkVault}>
              {allSelectedVaulted ? (
                <>
                  <Unlock /> {t("Remove from vault")}
                </>
              ) : (
                <>
                  <Lock /> {t("Move to vault")}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={bulkDelete}
              className="!text-rose-400 focus:!text-rose-300"
            >
              <Trash2 /> {t("Delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  ) : null;

  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={onFileInput}
      />

      {/* Clicking anywhere that isn't a card clears the selection. Cards
          stopPropagation on their own click so they don't trigger this. */}
      <div
        className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12"
        onClick={() => {
          if (selectionActive) clearSelection();
        }}
      >
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Heading (left) + storage (right) in one row on every screen.
              On mobile "Your"/"Vault" stack onto two lines; on md+ they sit
              inline and the paragraph lives under the heading (web layout
              preserved). */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
                <span className="block md:inline text-foreground">{t("Your")}</span>{" "}
                <span className="block md:inline neon-text">{t("Vault")}</span>
              </h1>
              {/* Web: paragraph under the heading. */}
              <p className="hidden md:block text-muted-foreground mt-2 max-w-xl">
                {t("You can protect your files and folders.")}
              </p>
            </div>
            <div className="shrink-0 w-auto md:w-64 text-right">
              <p className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-foreground leading-none whitespace-nowrap">
                {formatBytes(usedBytes)}
              </p>
              <p className="text-sm md:text-base text-muted-foreground mt-1.5">
                {t("of 5 GB used")}
              </p>
              <div className="mt-2.5 h-3 w-full rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all"
                  style={{
                    width: `${Math.max(2, Math.min(100, (usedBytes / 5e9) * 100))}%`
                  }}
                />
              </div>
            </div>
          </div>
          {/* Mobile: paragraph below the heading + storage row. */}
          <p className="md:hidden text-muted-foreground mt-3">
            {t("You can protect your files and folders.")}
          </p>
        </motion.div>

        {/* Drop zone — accepts files anywhere on it, also clickable. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={(e) => {
            // Only un-highlight when we actually leave the dropzone, not when
            // moving over child elements.
            if (e.currentTarget === e.target) setDrag(false);
          }}
          onDrop={onDrop}
          className={cn(
            "mt-8 rounded-3xl border-2 border-dashed glass p-6 md:p-8 grid place-items-center transition cursor-pointer",
            drag
              ? "border-cyan-400 ring-2 ring-cyan-400/40 bg-cyan-400/[0.04]"
              : "border-foreground/70 hover:border-foreground"
          )}
          onClick={onUploadClick}
        >
          <div className="flex flex-col items-center text-center max-w-md">
            <div className="size-16 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow">
              <Upload className="text-white" />
            </div>
            <h3 className="mt-3 font-semibold">
              {drag ? t("Drop to upload") : t("Drag & drop anywhere")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Or click to upload. Encrypted at rest, only your password unlocks the vault.")}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
              <Button variant="glass" size="sm" onClick={() => setNewFolderOpen(true)}>
                <Folder /> {t("New folder")}
              </Button>
              {!password ? (
                <Button variant="glass" size="sm" onClick={() => openPwDialog("set")}>
                  <ShieldCheck /> {t("Set vault password")}
                </Button>
              ) : unlocked ? (
                <>
                  <Button variant="glass" size="sm" onClick={() => lock()}>
                    <Lock /> {t("Lock vault")}
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => openPwDialog("change")}>
                    <ShieldCheck /> {t("Change password")}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="glass" size="sm" onClick={() => openPwDialog("unlock")}>
                    <Unlock /> {t("Unlock vault")}
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => openPwDialog("change")}>
                    <ShieldCheck /> {t("Change password")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search files…")}
              className="pl-9 border-foreground/70 focus-visible:border-foreground"
            />
          </div>
          {/* View switcher — grid (Finder) vs list. */}
          <div className="ml-auto inline-flex items-center rounded-xl glass-subtle p-0.5 border border-border/60">
            <button
              onClick={() => setView("grid")}
              aria-label={t("Grid view")}
              className={cn(
                "size-8 grid place-items-center rounded-lg transition",
                view === "grid"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label={t("List view")}
              className={cn(
                "size-8 grid place-items-center rounded-lg transition",
                view === "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={handleTabChange} className="mt-6">
          <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 md:inline-flex md:h-10 md:w-auto">
            <TabsTrigger value="all">{t("All files")}</TabsTrigger>
            <TabsTrigger value="starred">{t("Starred")}</TabsTrigger>
            <TabsTrigger value="vault">
              <Lock className="size-3 mr-1" /> {t("Vault")}
              {!unlocked && password && <span className="ml-1 text-[10px] opacity-70">{t("locked")}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-5">
            {/* Breadcrumb (left) + selection actions (right). Fixed min-height
                so the actions appearing on select never shift the grid down. */}
            <div className="flex items-center gap-2 mb-3 min-h-[34px]">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground overflow-x-auto no-scrollbar flex-1 min-w-0">
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-foreground/5 hover:text-foreground transition shrink-0"
                >
                  <Home className="size-3.5" /> {t("Vault root")}
                </button>
                {breadcrumb.map((b) => (
                  <React.Fragment key={b.id}>
                    <ChevronRight className="size-3.5 opacity-60 shrink-0" />
                    <button
                      onClick={() => setCurrentFolderId(b.id)}
                      className="px-2 py-1 rounded-lg hover:bg-foreground/5 hover:text-foreground transition truncate max-w-[180px] shrink-0"
                    >
                      {b.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              {selectionActions}
            </div>
            <NodeGrid
              nodes={visibleNodes}
              selectedIds={selected}
              onToggleSelect={toggleSelect}
              onSelectionChange={replaceSelection}
              view={view}
              onActivate={(n) =>
                accessNode(n, () => {
                  if (n.kind === "folder") setCurrentFolderId(n.id);
                  else openPreview(n, visibleNodes);
                })
              }
              onStar={toggleStar}
              onVault={(id) => {
                if (!password) {
                  requirePassword(() => toggleVault(id));
                  return;
                }
                toggleVault(id);
              }}
              onDelete={remove}
              emptyLabel={t("This folder is empty — drag files in or click Upload.")}
            />
          </TabsContent>

          <TabsContent value="starred" className="mt-5">
            {/* Always-present action row (fixed height) → no shift on select. */}
            <div className="flex justify-end items-center mb-3 min-h-[34px]">
              {selectionActions}
            </div>
            <NodeGrid
              nodes={visibleNodes}
              selectedIds={selected}
              onToggleSelect={toggleSelect}
              onSelectionChange={replaceSelection}
              view={view}
              onActivate={(n) =>
                accessNode(n, () => {
                  if (n.kind === "folder") setCurrentFolderId(n.id);
                  else openPreview(n, visibleNodes);
                })
              }
              onStar={toggleStar}
              onVault={(id) =>
                password ? toggleVault(id) : requirePassword(() => toggleVault(id))
              }
              onDelete={remove}
              emptyLabel={t("Nothing starred yet.")}
            />
          </TabsContent>

          <TabsContent value="vault" className="mt-5">
            {!unlocked ? (
              <VaultLockedState onUnlock={requestVaultAccess} hasPassword={!!password} />
            ) : (
              <>
                {/* Vault breadcrumb (left) + selection actions (right). Fixed
                    min-height so selecting never shifts the grid down. */}
                <div className="flex items-center gap-2 mb-3 min-h-[34px]">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground overflow-x-auto no-scrollbar flex-1 min-w-0">
                    <button
                      onClick={() => setCurrentFolderId(null)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-foreground/5 hover:text-foreground transition shrink-0"
                    >
                      <Lock className="size-3.5" /> {t("Vault root")}
                    </button>
                    {breadcrumb.map((b) => (
                      <React.Fragment key={b.id}>
                        <ChevronRight className="size-3.5 opacity-60 shrink-0" />
                        <button
                          onClick={() => setCurrentFolderId(b.id)}
                          className="px-2 py-1 rounded-lg hover:bg-foreground/5 hover:text-foreground transition truncate max-w-[180px] shrink-0"
                        >
                          {b.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                  {selectionActions}
                </div>
                <NodeGrid
                  nodes={visibleNodes}
                  selectedIds={selected}
                  onToggleSelect={toggleSelect}
                  onSelectionChange={replaceSelection}
                  view={view}
                  onActivate={(n) => {
                    if (n.kind === "folder") setCurrentFolderId(n.id);
                    else openPreview(n, visibleNodes);
                  }}
                  onStar={toggleStar}
                  onVault={toggleVault}
                  onDelete={remove}
                  emptyLabel={t("Your vault is empty. Move a file in from the All tab.")}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NewFolderDialog
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreate={(name) => createFolder(name, currentFolderId)}
      />

      <VaultPasswordDialog
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        mode={pwMode}
        onSubmit={(payload) => {
          let ok = false;
          if (pwMode === "change") {
            const { current, next } = payload as { current: string; next: string };
            ok = changePassword(current, next);
          } else {
            const pw = payload as string;
            ok = !password ? (setVaultPassword(pw), true) : unlock(pw);
          }
          if (ok) {
            // Fire whatever the user was trying to do before we asked for
            // the password (open a file, navigate into a folder, etc.).
            const queued = pendingActionRef.current;
            pendingActionRef.current = null;
            if (queued) queued();
          }
          return ok;
        }}
      />

      <FilePreviewDialog
        items={preview.items}
        startIndex={preview.startIndex}
        onClose={() => setPreview((p) => ({ ...p, startIndex: null }))}
      />
    </ScrollArea>
  );
}

/* ───────────── Empty / locked state for the Vault tab ───────────── */
function VaultLockedState({
  onUnlock,
  hasPassword
}: {
  onUnlock: () => void;
  hasPassword: boolean;
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl glass border border-border/60 px-6 py-12 text-center"
    >
      <div className="size-16 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow">
        <Lock className="text-white size-7" />
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
        {t("Vault is locked")}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        {hasPassword
          ? t("Enter your vault password to view protected files and folders.")
          : t("Set a vault password to start protecting files and folders.")}
      </p>
      <Button onClick={onUnlock} variant="gradient" className="mt-5">
        {hasPassword ? (
          <>
            <Unlock /> {t("Unlock vault")}
          </>
        ) : (
          <>
            <ShieldCheck /> {t("Create vault password")}
          </>
        )}
      </Button>
    </motion.div>
  );
}

/* ───────────── Grid of folders + files ───────────── */
function NodeGrid({
  nodes,
  onActivate,
  onStar,
  onVault,
  onDelete,
  emptyLabel,
  selectedIds,
  onToggleSelect,
  onSelectionChange,
  view
}: {
  nodes: VaultNode[];
  /** Fired on double-click — page wraps it in the password gate for vault items. */
  onActivate: (node: VaultNode) => void;
  onStar: (id: string) => void;
  onVault: (id: string) => void;
  onDelete: (id: string) => void;
  emptyLabel: string;
  /** Ids currently selected (single-click toggles membership). */
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  /** Replace the whole selection — used by the marquee drag-select. */
  onSelectionChange: (ids: string[]) => void;
  view: "grid" | "list";
}) {
  const areaRef = React.useRef<HTMLDivElement>(null);
  // Marquee (rubber-band) selection rectangle, in area-local coordinates.
  const [marquee, setMarquee] = React.useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    base: Set<string>;
    moved: boolean;
  } | null>(null);
  // Set when a marquee drag actually moved, so we can swallow the click that
  // fires on pointer-up (otherwise the page-level click-outside clears it).
  const draggedRef = React.useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    // Any fresh pointer-down clears stale drag state so a previous marquee
    // can't leave `draggedRef` true and swallow later clicks (e.g. dropdown
    // menu items, which bubble through this component via React portals).
    draggedRef.current = false;
    if (e.button !== 0) return;
    // React routes synthetic events (incl. pointer events) from portaled UI
    // — dropdown menus, dialogs — up through this component tree. Those
    // targets aren't real DOM descendants of the grid, so ignore them;
    // otherwise we'd start a marquee + capture the pointer and steal the
    // menu item's own pointer-up (breaking its onSelect).
    if (!areaRef.current || !areaRef.current.contains(e.target as Node)) return;
    // Only when starting on empty space — clicks that start on a card are
    // handled by the card itself.
    if ((e.target as HTMLElement).closest("[data-node-card]")) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      // Shift extends the current selection; otherwise the drag replaces it.
      base: e.shiftKey ? new Set(selectedIds) : new Set(),
      moved: false
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !areaRef.current) return;
    const left = Math.min(d.startX, e.clientX);
    const top = Math.min(d.startY, e.clientY);
    const w = Math.abs(e.clientX - d.startX);
    const h = Math.abs(e.clientY - d.startY);
    // Ignore tiny movements so a normal click on empty space still clears.
    if (!d.moved && w < 5 && h < 5) return;
    d.moved = true;
    draggedRef.current = true;

    const areaRect = areaRef.current.getBoundingClientRect();
    setMarquee({ x: left - areaRect.left, y: top - areaRect.top, w, h });

    // Hit-test every card against the marquee rect (screen coords).
    const next = new Set(d.base);
    areaRef.current
      .querySelectorAll<HTMLElement>("[data-node-card]")
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        const hit =
          r.right >= left &&
          r.left <= left + w &&
          r.bottom >= top &&
          r.top <= top + h;
        if (hit && el.dataset.nodeId) next.add(el.dataset.nodeId);
      });
    onSelectionChange(Array.from(next));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragRef.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
    dragRef.current = null;
    setMarquee(null);
  };

  // Swallow the click that follows a drag so the page-level
  // "click empties → clear selection" handler (and any card onClick) doesn't
  // wipe the marquee result. Crucially, only swallow clicks that land inside
  // this grid's own DOM — dropdown-menu items live in a React portal (outside
  // areaRef) and must keep working even if a stale drag flag lingers.
  const onClickCapture = (e: React.MouseEvent) => {
    if (
      draggedRef.current &&
      areaRef.current?.contains(e.target as Node)
    ) {
      e.stopPropagation();
    }
    draggedRef.current = false;
  };

  if (nodes.length === 0) {
    return (
      <div className="rounded-3xl glass border border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      ref={areaRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      // min-height gives a comfortable empty area to start a drag-select in.
      className="relative min-h-[45vh]"
    >
      <div
        className={
          view === "grid"
            ? "grid gap-3 grid-cols-[repeat(auto-fill,minmax(124px,1fr))] justify-items-center"
            : "flex flex-col gap-1"
        }
      >
        <AnimatePresence initial={false}>
          {nodes.map((n) => (
            <NodeItem
              key={n.id}
              node={n}
              view={view}
              selected={selectedIds.has(n.id)}
              onSelect={() => onToggleSelect(n.id)}
              onOpen={() => onActivate(n)}
              onStar={() => onStar(n.id)}
              onVault={() => onVault(n.id)}
              onDelete={() => onDelete(n.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Rubber-band rectangle. */}
      {marquee && (
        <div
          className="absolute z-10 rounded-md border border-cyan-400/80 bg-cyan-400/10 pointer-events-none"
          style={{
            left: marquee.x,
            top: marquee.y,
            width: marquee.w,
            height: marquee.h
          }}
        />
      )}
    </div>
  );
}

/* ───────────── Single file / folder item (grid + list) ───────────── */
function NodeItem({
  node,
  view,
  selected,
  onSelect,
  onOpen,
  onStar,
  onVault,
  onDelete
}: {
  node: VaultNode;
  view: "grid" | "list";
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onStar: () => void;
  onVault: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const unlocked = useVaultStore((s) => s.unlocked);
  const isFolder = node.kind === "folder";
  const kind = node.fileKind ?? "other";
  // Locked vault files never reveal their thumbnail until unlocked.
  const locked = !!node.vault && !unlocked;
  const showThumb = !isFolder && kind === "image" && (node.preview || node.url) && !locked;
  const label = locked ? t("Locked file") : node.name;

  const glyph = (sizeClass: string, thumbClass: string) =>
    isFolder ? (
      <MacFolder className={cn(sizeClass, "drop-shadow-sm")} />
    ) : showThumb ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={node.preview ?? node.url}
        alt=""
        className={cn(thumbClass, "rounded-md object-cover shadow-md ring-1 ring-black/10")}
        draggable={false}
      />
    ) : (
      <MacDoc kind={locked ? "locked" : kind} className={sizeClass} />
    );

  const hoverActions = (
    <div
      className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onStar}
        className="grid place-items-center transition hover:scale-110"
        aria-label={t("Star")}
      >
        <Star
          className={cn(
            "size-[19px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
            node.starred ? "text-amber-400 fill-amber-400" : "text-white"
          )}
        />
      </button>
      <CardMoreMenu
        onVault={onVault}
        isVault={!!node.vault}
        onDelete={onDelete}
        downloadHref={locked ? undefined : node.url}
        downloadName={node.name}
      />
    </div>
  );

  /* ---- LIST VIEW: a compact horizontal row ---- */
  if (view === "list") {
    return (
      <motion.div
        data-node-card
        data-node-id={node.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer select-none transition",
          selected ? "bg-cyan-400/15 ring-1 ring-cyan-400/40" : "hover:bg-foreground/[0.05]"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onDoubleClick={onOpen}
        title={node.name}
      >
        <div className="relative w-10 h-10 grid place-items-center shrink-0">
          {glyph("w-9 h-9", "max-w-[36px] max-h-[36px]")}
          {/* Lock indicator — hover only, no fill. */}
          {node.vault && (
            <Lock className="absolute -bottom-0.5 -right-0.5 size-3.5 text-foreground opacity-0 group-hover:opacity-100 transition drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.45)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {/* `line-clamp-1 break-all` (not `truncate`) so a long unbroken name
              can't force the row wider than the screen inside Radix's
              table-sized scroll viewport. */}
          <p className="text-sm font-medium line-clamp-1 break-all">
            {truncateName(label, 52)}
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-1 break-all">
            {isFolder
              ? t("Folder")
              : `${formatBytes(node.size)} · ${new Date(node.createdAt).toLocaleDateString()}`}
          </p>
        </div>
        <div className="shrink-0">{hoverActions}</div>
      </motion.div>
    );
  }

  /* ---- GRID VIEW: Finder-style icon + label, tight selection ---- */
  return (
    <motion.div
      data-node-card
      data-node-id={node.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // Fixed width so the selection highlight hugs the icon/label instead of
      // stretching across the whole grid cell.
      className={cn(
        "group relative w-[108px] flex flex-col items-center gap-1 px-1.5 py-2 rounded-2xl cursor-pointer select-none transition",
        selected ? "bg-cyan-400/15 ring-1 ring-cyan-400/40" : "hover:bg-foreground/[0.05]"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={onOpen}
      title={node.name}
    >
      <div className="relative w-[84px] h-[84px] grid place-items-center">
        {glyph("w-20 h-20", "max-w-[76px] max-h-[76px]")}

        {/* Lock indicator — only on hover (star state lives on the hover
            star button, so no separate star badge here). */}
        {node.vault && (
          <Lock className="absolute bottom-0.5 right-1.5 size-[18px] text-foreground opacity-0 group-hover:opacity-100 transition drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.45)]" />
        )}

        <div className="absolute -top-1 -right-1">{hoverActions}</div>
      </div>

      <p
        className={cn(
          "text-[11.5px] leading-tight text-center line-clamp-2 px-1.5 py-0.5 rounded-md max-w-full break-words",
          selected ? "bg-cyan-500 text-white" : "text-foreground/90"
        )}
      >
        {truncateName(label, 24)}
      </p>
    </motion.div>
  );
}

/* ───────────── macOS-style glyphs ───────────── */

/** A blue Big Sur–style folder. */
function MacFolder({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 44" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="mf-back" x1="28" y1="2" x2="28" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3DA8F5" />
          <stop offset="1" stopColor="#2C8FE6" />
        </linearGradient>
        <linearGradient id="mf-front" x1="28" y1="12" x2="28" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#86CCFB" />
          <stop offset="1" stopColor="#3F9BEE" />
        </linearGradient>
      </defs>
      {/* Back panel with the tab. */}
      <path
        d="M4 8C4 5.79 5.79 4 8 4h12.69c1.06 0 2.08.42 2.83 1.17l3.31 3.31c.75.75 1.77 1.17 2.83 1.17H48c2.21 0 4 1.79 4 4V36c0 2.21-1.79 4-4 4H8c-2.21 0-4-1.79-4-4V8Z"
        fill="url(#mf-back)"
      />
      {/* Front panel. */}
      <path
        d="M4 16c0-2.21 1.79-4 4-4h40c2.21 0 4 1.79 4 4v20c0 2.21-1.79 4-4 4H8c-2.21 0-4-1.79-4-4V16Z"
        fill="url(#mf-front)"
      />
    </svg>
  );
}

/** A white document glyph with a folded corner + a tinted type icon. The
 *  inner icon scales with the box so it works at any size. */
function MacDoc({
  kind,
  className
}: {
  kind: VaultFileKind | "locked";
  className?: string;
}) {
  const tint: Record<string, string> = {
    image: "text-emerald-500",
    video: "text-rose-500",
    audio: "text-violet-500",
    doc: "text-blue-500",
    archive: "text-amber-500",
    code: "text-slate-500",
    other: "text-zinc-400",
    locked: "text-amber-500"
  };
  const glyph =
    kind === "locked" ? <Lock /> : iconFor[kind as VaultFileKind] ?? <File />;
  return (
    <div className={cn("relative grid place-items-center", className ?? "w-[58px] h-[70px]")}>
      <svg viewBox="0 0 58 70" fill="none" className="w-[82%] h-full drop-shadow-sm" aria-hidden>
        <path
          d="M8 5c0-1.66 1.34-3 3-3h27l14 14v49c0 1.66-1.34 3-3 3H11c-1.66 0-3-1.34-3-3V5Z"
          fill="white"
        />
        <path d="M38 2l14 14H41c-1.66 0-3-1.34-3-3V2Z" fill="#CBD5E1" />
      </svg>
      <span
        className={cn(
          "absolute inset-0 grid place-items-center [&_svg]:w-2/5 [&_svg]:h-2/5",
          tint[kind] ?? "text-zinc-400"
        )}
      >
        {glyph}
      </span>
    </div>
  );
}

/* ───────────── "More" menu (vault toggle + delete) ───────────── */
function CardMoreMenu({
  onVault,
  isVault,
  onDelete,
  downloadHref,
  downloadName
}: {
  onVault: () => void;
  isVault: boolean;
  onDelete: () => void;
  downloadHref?: string;
  downloadName?: string;
}) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="grid place-items-center text-white hover:scale-110 transition"
          aria-label={t("More")}
        >
          <MoreHorizontal className="size-[19px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="!w-auto !min-w-[9rem]">
        <DropdownMenuItem onSelect={onVault}>
          {isVault ? (
            <>
              <Unlock /> {t("Remove from vault")}
            </>
          ) : (
            <>
              <Lock /> {t("Move to vault")}
            </>
          )}
        </DropdownMenuItem>
        {downloadHref && (
          <DropdownMenuItem asChild>
            <a href={downloadHref} download={downloadName} target="_blank" rel="noopener noreferrer">
              <Share2 /> {t("Download / share")}
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          className="!text-red-400 focus:!text-red-300"
        >
          <Trash2 /> {t("Delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
