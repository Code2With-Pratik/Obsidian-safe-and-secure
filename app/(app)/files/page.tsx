"use client";

import * as React from "react";
import { motion } from "framer-motion";
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
  Plus,
  Sparkles,
  Star,
  Share2,
  MoreHorizontal,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { files } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/types";

const iconFor: Record<FileItem["type"], React.ReactNode> = {
  image: <FileImage />,
  video: <FileVideo />,
  audio: <FileAudio />,
  doc: <FileText />,
  archive: <Archive />,
  code: <FileCode />,
  other: <File />
};

const colorFor: Record<FileItem["type"], string> = {
  image: "from-emerald-400 to-cyan-400",
  video: "from-pink-500 to-rose-500",
  audio: "from-violet-500 to-fuchsia-500",
  doc: "from-blue-500 to-cyan-400",
  archive: "from-amber-400 to-orange-500",
  code: "from-slate-400 to-slate-600",
  other: "from-zinc-400 to-zinc-600"
};

function formatBytes(b: number) {
  if (b > 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b > 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b > 1e3) return (b / 1e3).toFixed(0) + " KB";
  return b + " B";
}

export default function FilesPage() {
  const [drag, setDrag] = React.useState(false);

  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            Files & <span className="neon-text">Vault</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Drag, drop, share. Encrypt sensitive things into your private vault — only your face unlocks it.
          </p>
        </motion.div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
          }}
          className={cn(
            "mt-8 rounded-3xl border-2 border-dashed border-border/60 glass p-8 grid place-items-center transition",
            drag && "border-primary ring-2 ring-primary"
          )}
        >
          <div className="flex flex-col items-center text-center max-w-md">
            <div className="size-16 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow">
              <Upload className="text-white" />
            </div>
            <h3 className="mt-3 font-semibold">Drag & drop anywhere</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Or click to upload. Up to 5 GB per file. End-to-end encrypted at rest.
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="gradient" size="sm">
                <Plus /> Upload
              </Button>
              <Button variant="glass" size="sm">
                <Folder /> New folder
              </Button>
              <Button variant="glass" size="sm">
                <Lock /> Vault item
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search files…" className="pl-9" />
          </div>
          <Button variant="glass" size="default">
            <Filter />
            Filter
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            <span className="text-foreground">17.8 GB</span> of 50 GB used
          </div>
        </div>

        <Tabs defaultValue="all" className="mt-6">
          <TabsList>
            <TabsTrigger value="all">All files</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
            <TabsTrigger value="vault">
              <Lock className="size-3 mr-1" /> Vault
            </TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {files.map((f) => (
                <FileCardComponent key={f.id} file={f} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shared" className="mt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {files.slice(0, 3).map((f) => (
                <FileCardComponent key={f.id} file={f} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vault" className="mt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {files.filter((f) => f.vault).map((f) => (
                <FileCardComponent key={f.id} file={f} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {files.slice(0, 4).map((f) => (
                <FileCardComponent key={f.id} file={f} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

function FileCardComponent({ file }: { file: FileItem }) {
  const isImage = file.type === "image" && file.preview?.startsWith("http");
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="group relative rounded-2xl glass border border-border/60 overflow-hidden"
    >
      <div className="relative h-32 overflow-hidden">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${colorFor[file.type]} opacity-90`} />
        )}
        {!isImage && (
          <div className="absolute inset-0 grid place-items-center text-white text-4xl">
            {file.preview && file.preview.length < 10 ? file.preview : "📄"}
          </div>
        )}
        {file.vault && (
          <Badge variant="warning" className="absolute top-2 left-2">
            <Lock className="size-2.5" /> vault
          </Badge>
        )}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button className="size-7 rounded-full bg-black/40 backdrop-blur grid place-items-center text-white hover:bg-black/60">
            <Star className="size-3.5" />
          </button>
          <button className="size-7 rounded-full bg-black/40 backdrop-blur grid place-items-center text-white hover:bg-black/60">
            <Share2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <span className={`size-7 rounded-lg bg-gradient-to-br ${colorFor[file.type]} grid place-items-center text-white [&_svg]:size-3.5 shrink-0`}>
            {iconFor[file.type]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatBytes(file.size)} · just now
            </p>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
