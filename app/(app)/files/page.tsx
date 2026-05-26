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
  Plus,
  Star,
  Share2,
  MoreHorizontal,
  Filter,
  ChevronRight,
  Home,
  Trash2,
  ShieldCheck
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
import { cn } from "@/lib/utils";

const iconFor: Record<VaultFileKind, React.ReactNode> = {
  image: <FileImage />,
  video: <FileVideo />,
  audio: <FileAudio />,
  doc: <FileText />,
  archive: <Archive />,
  code: <FileCode />,
  other: <File />
};

const colorFor: Record<VaultFileKind, string> = {
  image: "from-emerald-400 to-cyan-400",
  video: "from-pink-500 to-rose-500",
  audio: "from-violet-500 to-fuchsia-500",
  doc: "from-blue-500 to-cyan-400",
  archive: "from-amber-400 to-orange-500",
  code: "from-slate-400 to-slate-600",
  other: "from-zinc-400 to-zinc-600"
};

function formatBytes(b?: number) {
  if (b == null) return "";
  if (b > 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b > 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b > 1e3) return (b / 1e3).toFixed(0) + " KB";
  return b + " B";
}

export default function FilesPage() {
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

  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [drag, setDrag] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [pwOpen, setPwOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /* ---- derived ---- */
  const breadcrumb = pathTo(currentFolderId);

  /** Pick the right slice of nodes for the current tab. */
  const visibleNodes = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matchesQ = (n: VaultNode) => !needle || n.name.toLowerCase().includes(needle);

    if (tab === "vault") {
      // Vault tab — flat list of every vault item (only when unlocked).
      if (!unlocked) return [];
      return nodes.filter((n) => n.vault).filter(matchesQ);
    }
    if (tab === "starred") {
      return nodes.filter((n) => n.starred).filter((n) => !n.vault || unlocked).filter(matchesQ);
    }
    if (tab === "recent") {
      return [...nodes]
        .filter((n) => n.kind === "file")
        .filter((n) => !n.vault || unlocked)
        .filter(matchesQ)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 12);
    }
    // "all" — show contents of the current folder only.
    return byParent(currentFolderId)
      .filter((n) => !n.vault || unlocked)
      .filter(matchesQ);
  }, [tab, nodes, byParent, currentFolderId, q, unlocked]);

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
    setPwOpen(true);
  };

  // Total bytes (across files, ignoring vault items the user can't see yet).
  const usedBytes = React.useMemo(
    () =>
      nodes
        .filter((n) => n.kind === "file" && (!n.vault || unlocked))
        .reduce((a, n) => a + (n.size ?? 0), 0),
    [nodes, unlocked]
  );

  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={onFileInput}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            Files & <span className="neon-text">Vault</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Drag, drop, share. Lock anything sensitive in your vault — protected by a
            password only you know.
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
            "mt-8 rounded-3xl border-2 border-dashed glass p-8 grid place-items-center transition cursor-pointer",
            drag
              ? "border-cyan-400 ring-2 ring-cyan-400/40 bg-cyan-400/[0.04]"
              : "border-border/60 hover:border-foreground/30"
          )}
          onClick={onUploadClick}
        >
          <div className="flex flex-col items-center text-center max-w-md">
            <div className="size-16 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow">
              <Upload className="text-white" />
            </div>
            <h3 className="mt-3 font-semibold">
              {drag ? "Drop to upload" : "Drag & drop anywhere"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Or click to upload. Encrypted at rest, only your password unlocks the vault.
            </p>
            <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
              <Button variant="gradient" size="sm" onClick={onUploadClick}>
                <Plus /> Upload
              </Button>
              <Button variant="glass" size="sm" onClick={() => setNewFolderOpen(true)}>
                <Folder /> New folder
              </Button>
              {!password ? (
                <Button variant="glass" size="sm" onClick={() => setPwOpen(true)}>
                  <ShieldCheck /> Set vault password
                </Button>
              ) : unlocked ? (
                <Button variant="glass" size="sm" onClick={() => lock()}>
                  <Lock /> Lock vault
                </Button>
              ) : (
                <Button variant="glass" size="sm" onClick={() => setPwOpen(true)}>
                  <Unlock /> Unlock vault
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-8 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search files…"
              className="pl-9"
            />
          </div>
          <Button variant="glass" size="default">
            <Filter />
            Filter
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            <span className="text-foreground">{formatBytes(usedBytes)}</span> used
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList>
            <TabsTrigger value="all">All files</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
            <TabsTrigger value="vault">
              <Lock className="size-3 mr-1" /> Vault
              {!unlocked && password && <span className="ml-1 text-[10px] opacity-70">locked</span>}
            </TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-5">
            {/* Breadcrumb only relevant to All files (folder browsing). */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCurrentFolderId(null)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-foreground/5 hover:text-foreground transition"
              >
                <Home className="size-3.5" /> Vault root
              </button>
              {breadcrumb.map((b) => (
                <React.Fragment key={b.id}>
                  <ChevronRight className="size-3.5 opacity-60" />
                  <button
                    onClick={() => setCurrentFolderId(b.id)}
                    className="px-2 py-1 rounded-lg hover:bg-foreground/5 hover:text-foreground transition truncate max-w-[180px]"
                  >
                    {b.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <NodeGrid
              nodes={visibleNodes}
              onOpenFolder={setCurrentFolderId}
              onStar={toggleStar}
              onVault={(id) => {
                if (!password) {
                  setPwOpen(true);
                  return;
                }
                toggleVault(id);
              }}
              onDelete={remove}
              emptyLabel={`This folder is empty — drag files in or click Upload.`}
            />
          </TabsContent>

          <TabsContent value="starred" className="mt-5">
            <NodeGrid
              nodes={visibleNodes}
              onOpenFolder={setCurrentFolderId}
              onStar={toggleStar}
              onVault={(id) => password ? toggleVault(id) : setPwOpen(true)}
              onDelete={remove}
              emptyLabel="Nothing starred yet."
            />
          </TabsContent>

          <TabsContent value="vault" className="mt-5">
            {!unlocked ? (
              <VaultLockedState onUnlock={requestVaultAccess} hasPassword={!!password} />
            ) : (
              <NodeGrid
                nodes={visibleNodes}
                onOpenFolder={setCurrentFolderId}
                onStar={toggleStar}
                onVault={toggleVault}
                onDelete={remove}
                emptyLabel="Your vault is empty. Move a file in from the All tab."
              />
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-5">
            <NodeGrid
              nodes={visibleNodes}
              onOpenFolder={setCurrentFolderId}
              onStar={toggleStar}
              onVault={(id) => password ? toggleVault(id) : setPwOpen(true)}
              onDelete={remove}
              emptyLabel="No recent uploads yet."
            />
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
        mode={password ? "unlock" : "set"}
        onSubmit={(pw) => {
          if (!password) {
            setVaultPassword(pw);
            return true;
          }
          return unlock(pw);
        }}
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
        Vault is locked
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        {hasPassword
          ? "Enter your vault password to view protected files and folders."
          : "Set a vault password to start protecting files and folders."}
      </p>
      <Button onClick={onUnlock} variant="gradient" className="mt-5">
        {hasPassword ? (
          <>
            <Unlock /> Unlock vault
          </>
        ) : (
          <>
            <ShieldCheck /> Create vault password
          </>
        )}
      </Button>
    </motion.div>
  );
}

/* ───────────── Grid of folders + files ───────────── */
function NodeGrid({
  nodes,
  onOpenFolder,
  onStar,
  onVault,
  onDelete,
  emptyLabel
}: {
  nodes: VaultNode[];
  onOpenFolder: (id: string) => void;
  onStar: (id: string) => void;
  onVault: (id: string) => void;
  onDelete: (id: string) => void;
  emptyLabel: string;
}) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-3xl glass border border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <AnimatePresence initial={false}>
        {nodes.map((n) =>
          n.kind === "folder" ? (
            <FolderCard
              key={n.id}
              node={n}
              onOpen={() => onOpenFolder(n.id)}
              onStar={() => onStar(n.id)}
              onVault={() => onVault(n.id)}
              onDelete={() => onDelete(n.id)}
            />
          ) : (
            <FileCard
              key={n.id}
              node={n}
              onStar={() => onStar(n.id)}
              onVault={() => onVault(n.id)}
              onDelete={() => onDelete(n.id)}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────── Single folder card ───────────── */
function FolderCard({
  node,
  onOpen,
  onStar,
  onVault,
  onDelete
}: {
  node: VaultNode;
  onOpen: () => void;
  onStar: () => void;
  onVault: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -3 }}
      className="group relative rounded-2xl glass border border-border/60 overflow-hidden cursor-pointer"
      onClick={onOpen}
    >
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-amber-400/50 to-orange-500/50 grid place-items-center">
        <Folder className="size-12 text-white drop-shadow" />
        {node.vault && (
          <Badge variant="warning" className="absolute top-2 left-2">
            <Lock className="size-2.5" /> vault
          </Badge>
        )}
        <CardOverlayActions
          onStar={onStar}
          starred={node.starred}
          extra={
            <CardMoreMenu
              onVault={onVault}
              isVault={!!node.vault}
              onDelete={onDelete}
            />
          }
        />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Folder className="size-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{node.name}</p>
            <p className="text-[10px] text-muted-foreground">Folder</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────── Single file card ───────────── */
function FileCard({
  node,
  onStar,
  onVault,
  onDelete
}: {
  node: VaultNode;
  onStar: () => void;
  onVault: () => void;
  onDelete: () => void;
}) {
  const kind = node.fileKind ?? "other";
  const isImage = kind === "image" && (node.preview || node.url);
  const openFile = () => {
    if (node.url) window.open(node.url, "_blank", "noopener,noreferrer");
  };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -3 }}
      className="group relative rounded-2xl glass border border-border/60 overflow-hidden cursor-pointer"
      onClick={openFile}
    >
      <div className="relative h-32 overflow-hidden">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={node.preview ?? node.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${colorFor[kind]} opacity-90`} />
        )}
        {!isImage && (
          <div className="absolute inset-0 grid place-items-center text-white text-4xl">
            <span className="[&_svg]:size-10">{iconFor[kind]}</span>
          </div>
        )}
        {node.vault && (
          <Badge variant="warning" className="absolute top-2 left-2">
            <Lock className="size-2.5" /> vault
          </Badge>
        )}
        <CardOverlayActions
          onStar={onStar}
          starred={node.starred}
          extra={
            <CardMoreMenu
              onVault={onVault}
              isVault={!!node.vault}
              onDelete={onDelete}
              downloadHref={node.url}
              downloadName={node.name}
            />
          }
        />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <span
            className={`size-7 rounded-lg bg-gradient-to-br ${colorFor[kind]} grid place-items-center text-white [&_svg]:size-3.5 shrink-0`}
          >
            {iconFor[kind]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{node.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatBytes(node.size)} · {new Date(node.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────── Hover overlay (star + menu) ───────────── */
function CardOverlayActions({
  onStar,
  starred,
  extra
}: {
  onStar: () => void;
  starred?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onStar}
        className={cn(
          "size-7 rounded-full backdrop-blur grid place-items-center text-white transition",
          starred ? "bg-amber-400/80 hover:bg-amber-400" : "bg-black/40 hover:bg-black/60"
        )}
      >
        <Star className={cn("size-3.5", starred && "fill-current")} />
      </button>
      {extra}
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="size-7 rounded-full bg-black/40 backdrop-blur grid place-items-center text-white hover:bg-black/60"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="!w-48">
        <DropdownMenuItem onSelect={onVault}>
          {isVault ? (
            <>
              <Unlock /> Remove from vault
            </>
          ) : (
            <>
              <Lock /> Move to vault
            </>
          )}
        </DropdownMenuItem>
        {downloadHref && (
          <DropdownMenuItem asChild>
            <a href={downloadHref} download={downloadName} target="_blank" rel="noopener noreferrer">
              <Share2 /> Download / share
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          className="!text-red-400 focus:!text-red-300"
        >
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
