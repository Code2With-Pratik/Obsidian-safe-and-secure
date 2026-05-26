"use client";

import { create } from "zustand";

export type VaultFileKind = "image" | "video" | "audio" | "doc" | "archive" | "code" | "other";

export interface VaultNode {
  id: string;
  /** "folder" entries hold children via parentId, "file" entries are leaves. */
  kind: "folder" | "file";
  name: string;
  /** null = top-level. */
  parentId: string | null;
  createdAt: string;
  starred?: boolean;
  /** When true, the item only appears once the vault is unlocked. */
  vault?: boolean;

  // file-only
  fileKind?: VaultFileKind;
  size?: number;
  mime?: string;
  /** Blob URL — created via URL.createObjectURL(file) at upload time. */
  url?: string;
  /** Optional thumbnail data-URL (we generate one for images). */
  preview?: string;
}

interface VaultState {
  nodes: VaultNode[];
  /** null = no vault password set yet. */
  password: string | null;
  /** true while the vault is open this session. */
  unlocked: boolean;

  /* ---- queries ---- */
  byParent: (parentId: string | null) => VaultNode[];
  pathTo: (id: string | null) => VaultNode[]; // breadcrumb chain

  /* ---- mutations ---- */
  addFiles: (files: File[], parentId: string | null) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => VaultNode;
  rename: (id: string, name: string) => void;
  toggleStar: (id: string) => void;
  toggleVault: (id: string) => void;
  remove: (id: string) => void;

  /* ---- vault password ---- */
  setVaultPassword: (password: string) => void;
  unlock: (password: string) => boolean;
  lock: () => void;
}

/** Crude kind detection from MIME type or extension. */
function detectKind(file: File): VaultFileKind {
  const mime = file.type;
  const name = file.name.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    /\.(pdf|docx?|txt|md|rtf|odt|pages)$/i.test(name) ||
    /^(application\/pdf|application\/msword)/.test(mime)
  )
    return "doc";
  if (/\.(zip|tar|gz|rar|7z)$/i.test(name)) return "archive";
  if (/\.(ts|tsx|js|jsx|json|css|html|py|rb|go|rs|java|swift|sh)$/i.test(name)) return "code";
  return "other";
}

/** Stable, collision-free id. */
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Try to read an image File as a data URL so we can show a thumbnail.
 *  Fails-soft — returns undefined if the read fails. */
function readPreview(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

export const useVaultStore = create<VaultState>((set, get) => ({
  // Seed with a couple of folders so the page isn't empty on first load.
  nodes: [
    { id: "f-root-photos", kind: "folder", name: "Photos", parentId: null, createdAt: new Date().toISOString() },
    { id: "f-root-docs",   kind: "folder", name: "Documents", parentId: null, createdAt: new Date().toISOString() },
    { id: "f-root-secret", kind: "folder", name: "Top Secret", parentId: null, createdAt: new Date().toISOString(), vault: true }
  ],
  password: null,
  unlocked: false,

  byParent: (parentId) => get().nodes.filter((n) => n.parentId === parentId),

  pathTo: (id) => {
    const out: VaultNode[] = [];
    const all = get().nodes;
    let cur = id ? all.find((n) => n.id === id) ?? null : null;
    while (cur) {
      out.unshift(cur);
      cur = cur.parentId ? all.find((n) => n.id === cur!.parentId) ?? null : null;
    }
    return out;
  },

  addFiles: async (files, parentId) => {
    const newNodes: VaultNode[] = [];
    for (const f of files) {
      const preview = await readPreview(f);
      newNodes.push({
        id: uid("v"),
        kind: "file",
        name: f.name,
        parentId,
        createdAt: new Date().toISOString(),
        fileKind: detectKind(f),
        size: f.size,
        mime: f.type,
        url: URL.createObjectURL(f),
        preview
      });
    }
    set((s) => ({ nodes: [...s.nodes, ...newNodes] }));
  },

  createFolder: (name, parentId) => {
    const folder: VaultNode = {
      id: uid("f"),
      kind: "folder",
      name: name.trim() || "Untitled folder",
      parentId,
      createdAt: new Date().toISOString()
    };
    set((s) => ({ nodes: [...s.nodes, folder] }));
    return folder;
  },

  rename: (id, name) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, name: name.trim() || n.name } : n))
    })),

  toggleStar: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, starred: !n.starred } : n))
    })),

  toggleVault: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, vault: !n.vault } : n))
    })),

  remove: (id) => {
    // Recursively collect ids under the target so we drop their subtree too.
    const all = get().nodes;
    const drop = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of all) {
        if (n.parentId && drop.has(n.parentId) && !drop.has(n.id)) {
          drop.add(n.id);
          changed = true;
        }
      }
    }
    // Revoke blob URLs we created so we don't leak.
    for (const n of all) {
      if (drop.has(n.id) && n.url?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(n.url);
        } catch {}
      }
    }
    set((s) => ({ nodes: s.nodes.filter((n) => !drop.has(n.id)) }));
  },

  setVaultPassword: (password) => {
    if (!password) return;
    set({ password, unlocked: true });
  },

  unlock: (password) => {
    if (!get().password) {
      // No password yet — treat the attempt as "set + unlock".
      set({ password, unlocked: true });
      return true;
    }
    if (password === get().password) {
      set({ unlocked: true });
      return true;
    }
    return false;
  },

  lock: () => set({ unlocked: false })
}));
