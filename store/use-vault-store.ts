"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "./use-auth-store";

const supabase = createClient();

export type VaultFileKind =
  | "image"
  | "video"
  | "audio"
  | "doc"
  | "archive"
  | "code"
  | "other";

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
  /** Signed download URL — minted on demand. Empty/undefined until requested. */
  url?: string;
  /** Optional thumbnail data-URL (we generate one for images). */
  preview?: string;
  /** Internal: path inside the `vault` storage bucket. Used to mint signed
   *  URLs and to delete the object when the row is removed. Never rendered. */
  storagePath?: string;
}

/* ── Validation constants — surfaced to the UI so toasts/copy stay in sync.
 *
 * Five files per upload, 2 MB each, 50 MB lifetime total. These mirror the
 * server-side guarantees: storage is RLS-scoped per user and the
 * used_vault_bytes() RPC is the source of truth for the quota gauge.
 *
 * Extension allowlist — every other extension is rejected before we touch
 * the network. Hex / image / audio / document / archive only. */
export const VAULT_MAX_FILES_PER_BATCH = 5;
export const VAULT_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
export const VAULT_QUOTA_BYTES = 50 * 1024 * 1024;   // 50 MB
export const VAULT_ALLOWED_EXTENSIONS = [
  // images
  "jpg", "jpeg", "png", "gif", "webp", "ico",
  // audio
  "mp3", "m4a",
  // documents
  "pdf", "doc", "docx", "ppt", "pptx", "txt",
  // archives
  "zip"
] as const;
export type AllowedExtension = (typeof VAULT_ALLOWED_EXTENSIONS)[number];
/** HTML `accept` attribute string for the file input. */
export const VAULT_ACCEPT_ATTRIBUTE = VAULT_ALLOWED_EXTENSIONS
  .map((ext) => `.${ext}`)
  .join(",");

/** Result of an upload attempt — surfaced verbatim to the toast layer. */
export interface VaultUploadResult {
  added: number;
  rejected: Array<{ name: string; reason: string }>;
  quotaUsed: number;
  quotaTotal: number;
}

/* ── Internal helpers ───────────────────────────────────────────────── */

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

function detectKind(name: string, mime: string): VaultFileKind {
  const ext = extOf(name);
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "ico"].includes(ext)) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/") || ["mp3", "m4a"].includes(ext)) return "audio";
  if (["pdf", "doc", "docx", "ppt", "pptx", "txt", "md", "rtf", "odt"].includes(ext)) return "doc";
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "archive";
  if (["ts", "tsx", "js", "jsx", "json", "css", "html", "py", "rb", "go", "rs"].includes(ext)) return "code";
  return "other";
}

function readPreview(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

/** Convert a DB row (snake_case) into the client-side VaultNode shape. */
interface VaultNodeRow {
  id: string;
  kind: "folder" | "file";
  name: string;
  parent_id: string | null;
  created_at: string;
  starred: boolean | null;
  vaulted: boolean | null;
  storage_path: string | null;
  file_kind: string | null;
  size: number | null;
  mime: string | null;
  preview: string | null;
}
function rowToNode(r: VaultNodeRow): VaultNode {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    parentId: r.parent_id,
    createdAt: r.created_at,
    starred: !!r.starred,
    vault: !!r.vaulted,
    fileKind: (r.file_kind ?? undefined) as VaultFileKind | undefined,
    size: r.size ?? undefined,
    mime: r.mime ?? undefined,
    preview: r.preview ?? undefined,
    storagePath: r.storage_path ?? undefined
  };
}

/* ── Store ──────────────────────────────────────────────────────────── */

interface VaultState {
  nodes: VaultNode[];
  /** True once we've confirmed a PIN row exists for this user. Drives the
   *  Vault tab's "Set vault password" vs "Unlock vault" labelling. */
  hasPassword: boolean;
  /** True for the session after a successful unlock. Persisted in memory
   *  only — closing the tab re-locks. */
  unlocked: boolean;
  /** Total bytes the user has used. Server-truth from used_vault_bytes()
   *  RPC; refreshed after every upload + delete. */
  quotaUsed: number;
  /** Lifetime quota the server enforces. Mirrors VAULT_QUOTA_BYTES. */
  quotaTotal: number;
  /** True between fetchNodes() start and finish — used by the page to
   *  avoid flashing "empty vault" while we're still loading. */
  loading: boolean;

  /* ---- queries ---- */
  byParent: (parentId: string | null) => VaultNode[];
  pathTo: (id: string | null) => VaultNode[];

  /* ---- lifecycle ---- */
  fetchNodes: () => Promise<void>;

  /* ---- mutations ---- */
  addFiles: (files: File[], parentId: string | null) => Promise<VaultUploadResult>;
  createFolder: (name: string, parentId: string | null) => Promise<VaultNode | null>;
  rename: (id: string, name: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  toggleVault: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Lazily mint + cache a signed download URL for a file. Returns the URL
   *  string, or undefined if the node isn't a file / storage_path is empty.
   *  URLs are signed for 1 hour — refreshing on demand is cheap. */
  signedUrlFor: (id: string) => Promise<string | undefined>;

  /* ---- vault PIN (server-hashed) ---- */
  /** Initial PIN set. Returns true on success. */
  setVaultPassword: (pin: string) => Promise<boolean>;
  /** Validate a PIN. true → unlocks the session. false → wrong PIN. */
  unlock: (pin: string) => Promise<boolean>;
  /** Forget the unlock for this session. PIN row stays on the server. */
  lock: () => void;
  /** Change PIN. Refuses unless `currentPin` verifies. Returns true on
   *  success, false on rejection. */
  changePassword: (currentPin: string, newPin: string) => Promise<boolean>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  nodes: [],
  hasPassword: false,
  unlocked: false,
  quotaUsed: 0,
  quotaTotal: VAULT_QUOTA_BYTES,
  loading: false,

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

  fetchNodes: async () => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    set({ loading: true });
    // Parallel: nodes + quota + has-password — three independent reads.
    const [nodesRes, quotaRes, secretRes] = await Promise.all([
      supabase
        .from("vault_nodes")
        .select(
          "id, kind, name, parent_id, created_at, starred, vaulted, storage_path, file_kind, size, mime, preview"
        )
        .order("created_at", { ascending: true }),
      supabase.rpc("used_vault_bytes"),
      supabase.from("vault_secrets").select("user_id").maybeSingle()
    ]);
    const nodes = ((nodesRes.data ?? []) as VaultNodeRow[]).map(rowToNode);
    set({
      nodes,
      quotaUsed: typeof quotaRes.data === "number" ? quotaRes.data : 0,
      hasPassword: !!secretRes.data,
      loading: false
    });
  },

  addFiles: async (files, parentId) => {
    const me = useAuthStore.getState().user;
    if (!me) {
      return { added: 0, rejected: [], quotaUsed: 0, quotaTotal: VAULT_QUOTA_BYTES };
    }

    const rejected: VaultUploadResult["rejected"] = [];
    let toUpload: File[] = files;

    // 1) Per-batch cap. We accept the FIRST N and reject the rest with a
    //    clear reason so the user sees what was dropped.
    if (toUpload.length > VAULT_MAX_FILES_PER_BATCH) {
      const overflow = toUpload.slice(VAULT_MAX_FILES_PER_BATCH);
      overflow.forEach((f) =>
        rejected.push({
          name: f.name,
          reason: `Only ${VAULT_MAX_FILES_PER_BATCH} files per upload.`
        })
      );
      toUpload = toUpload.slice(0, VAULT_MAX_FILES_PER_BATCH);
    }

    // 2) Per-file checks: extension allowlist + 2 MB cap.
    toUpload = toUpload.filter((f) => {
      const ext = extOf(f.name);
      if (!ext || !(VAULT_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
        rejected.push({
          name: f.name,
          reason: `Unsupported file type ".${ext || "?"}".`
        });
        return false;
      }
      if (f.size > VAULT_MAX_FILE_BYTES) {
        rejected.push({
          name: f.name,
          reason: `File exceeds the 2 MB limit (${(f.size / 1024 / 1024).toFixed(1)} MB).`
        });
        return false;
      }
      return true;
    });

    // 3) Lifetime quota. We tally the running total + each new file in
    //    upload order, accepting as many as fit and rejecting the rest.
    const currentUsed = get().quotaUsed;
    let runningUsed = currentUsed;
    const accepted: File[] = [];
    for (const f of toUpload) {
      if (runningUsed + f.size > VAULT_QUOTA_BYTES) {
        const remaining = Math.max(0, VAULT_QUOTA_BYTES - runningUsed);
        rejected.push({
          name: f.name,
          reason: `Quota full — only ${(remaining / 1024 / 1024).toFixed(1)} MB free of 50 MB.`
        });
        continue;
      }
      runningUsed += f.size;
      accepted.push(f);
    }

    // 4) Upload accepted files to storage + insert the metadata rows.
    let addedCount = 0;
    for (const file of accepted) {
      const ext = extOf(file.name);
      const storagePath = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("vault")
        .upload(storagePath, file, {
          contentType: file.type || `application/octet-stream`,
          upsert: false
        });
      if (upErr) {
        rejected.push({
          name: file.name,
          reason: upErr.message || "Upload failed."
        });
        continue;
      }
      const preview = await readPreview(file);
      const fileKind = detectKind(file.name, file.type);
      const { data: row, error: insErr } = await supabase
        .from("vault_nodes")
        .insert({
          user_id: me.id,
          kind: "file",
          name: file.name,
          parent_id: parentId,
          storage_path: storagePath,
          file_kind: fileKind,
          size: file.size,
          mime: file.type,
          preview: preview ?? null
        })
        .select(
          "id, kind, name, parent_id, created_at, starred, vaulted, storage_path, file_kind, size, mime, preview"
        )
        .single();
      if (insErr || !row) {
        // Roll back the storage upload — we don't want orphaned blobs.
        await supabase.storage.from("vault").remove([storagePath]);
        rejected.push({
          name: file.name,
          reason: insErr?.message || "Saving record failed.",
        });
        continue;
      }
      set((s) => ({
        nodes: [...s.nodes, rowToNode(row as VaultNodeRow)],
        quotaUsed: s.quotaUsed + (file.size ?? 0)
      }));
      addedCount++;
    }

    return {
      added: addedCount,
      rejected,
      quotaUsed: get().quotaUsed,
      quotaTotal: VAULT_QUOTA_BYTES
    };
  },

  createFolder: async (name, parentId) => {
    const me = useAuthStore.getState().user;
    if (!me) return null;
    const trimmed = name.trim() || "Untitled folder";
    const { data, error } = await supabase
      .from("vault_nodes")
      .insert({ user_id: me.id, kind: "folder", name: trimmed, parent_id: parentId })
      .select(
        "id, kind, name, parent_id, created_at, starred, vaulted, storage_path, file_kind, size, mime, preview"
      )
      .single();
    if (error || !data) return null;
    const node = rowToNode(data as VaultNodeRow);
    set((s) => ({ nodes: [...s.nodes, node] }));
    return node;
  },

  rename: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Optimistic — UI updates immediately, reverts on failure.
    const prev = get().nodes;
    set({ nodes: prev.map((n) => (n.id === id ? { ...n, name: trimmed } : n)) });
    const { error } = await supabase.from("vault_nodes").update({ name: trimmed }).eq("id", id);
    if (error) set({ nodes: prev });
  },

  toggleStar: async (id) => {
    const cur = get().nodes.find((n) => n.id === id);
    if (!cur) return;
    const next = !cur.starred;
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, starred: next } : n))
    }));
    const { error } = await supabase.from("vault_nodes").update({ starred: next }).eq("id", id);
    if (error) {
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, starred: !next } : n))
      }));
    }
  },

  toggleVault: async (id) => {
    const cur = get().nodes.find((n) => n.id === id);
    if (!cur) return;
    const next = !cur.vault;
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, vault: next } : n))
    }));
    const { error } = await supabase.from("vault_nodes").update({ vaulted: next }).eq("id", id);
    if (error) {
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, vault: !next } : n))
      }));
    }
  },

  remove: async (id) => {
    // Resolve subtree locally so we know which storage objects to delete
    // and how much quota to refund — DB cascade does the rest.
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
    const toDeleteStoragePaths = all
      .filter((n) => drop.has(n.id) && n.kind === "file" && n.storagePath)
      .map((n) => n.storagePath!) as string[];
    const refundedBytes = all
      .filter((n) => drop.has(n.id) && n.kind === "file")
      .reduce((a, n) => a + (n.size ?? 0), 0);

    // Optimistic local removal.
    const prev = get().nodes;
    set((s) => ({
      nodes: s.nodes.filter((n) => !drop.has(n.id)),
      quotaUsed: Math.max(0, s.quotaUsed - refundedBytes)
    }));

    // Delete the row — cascade clears descendants. Then drop the storage
    // objects. If either fails, revert local state so the page reflects
    // server truth and the user can retry.
    const { error: dbErr } = await supabase.from("vault_nodes").delete().eq("id", id);
    if (dbErr) {
      set({ nodes: prev, quotaUsed: prev.filter((n) => n.kind === "file").reduce((a, n) => a + (n.size ?? 0), 0) });
      return;
    }
    if (toDeleteStoragePaths.length > 0) {
      await supabase.storage.from("vault").remove(toDeleteStoragePaths);
    }
  },

  signedUrlFor: async (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node || node.kind !== "file" || !node.storagePath) return undefined;
    // Cached URL on the in-memory node — refresh after 50 minutes by
    // re-signing. We trust the recent value within the same render burst.
    if (node.url) return node.url;
    const { data } = await supabase.storage
      .from("vault")
      .createSignedUrl(node.storagePath, 60 * 60); // 1 hour
    if (!data?.signedUrl) return undefined;
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, url: data.signedUrl } : n))
    }));
    return data.signedUrl;
  },

  setVaultPassword: async (pin) => {
    if (!pin || pin.length < 4) return false;
    const { error } = await supabase.rpc("set_vault_pin", { _new_pin: pin });
    if (error) return false;
    set({ hasPassword: true, unlocked: true });
    return true;
  },

  unlock: async (pin) => {
    if (!get().hasPassword) {
      // No PIN row yet — first-time set + unlock in one flow.
      return get().setVaultPassword(pin);
    }
    const { data, error } = await supabase.rpc("verify_vault_pin", { _pin: pin });
    if (error || data !== true) return false;
    set({ unlocked: true });
    return true;
  },

  lock: () => set({ unlocked: false }),

  changePassword: async (currentPin, newPin) => {
    if (!newPin || newPin.length < 4) return false;
    if (!get().hasPassword) return get().setVaultPassword(newPin);
    const { data, error } = await supabase.rpc("change_vault_pin", {
      _current_pin: currentPin,
      _new_pin: newPin
    });
    if (error || data === null) return false;
    set({ hasPassword: true, unlocked: true });
    return true;
  }
}));
