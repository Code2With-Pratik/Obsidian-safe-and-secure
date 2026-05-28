"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Ghost, KeyRound, Plus, Search, Share2 } from "lucide-react";
import { GhostRoomCard } from "@/features/ghost/ghost-room-card";
import { CreateGhostDialog } from "@/features/ghost/create-ghost-dialog";
import { JoinPinDialog } from "@/features/ghost/join-pin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGhostStore } from "@/store/use-ghost-store";
import { useT } from "@/lib/i18n";
import type { GhostRoom } from "@/types";

export default function GhostRoomsPage() {
  const t = useT();
  const [q, setQ] = React.useState("");
  const rooms = useGhostStore((s) => s.rooms);
  const joinedIds = useGhostStore((s) => s.joinedIds);
  const createdIds = useGhostStore((s) => s.createdIds);
  const joinRoom = useGhostStore((s) => s.joinRoom);

  const [pinDialogRoom, setPinDialogRoom] = React.useState<GhostRoom | null>(null);
  const [joinByPinOpen, setJoinByPinOpen] = React.useState(false);

  const matches = (r: GhostRoom) =>
    r.name.toLowerCase().includes(q.toLowerCase()) ||
    r.topic.toLowerCase().includes(q.toLowerCase());
  const filtered = rooms.filter(matches);
  const newest = [...rooms]
    .sort((a, b) => (b.id > a.id ? 1 : -1))
    .filter(matches)
    .slice(0, 6);
  const mine = rooms.filter((r) => createdIds.includes(r.id)).filter(matches);
  const joined = rooms.filter((r) => joinedIds.includes(r.id)).filter(matches);

  const handleJoinClick = (room: GhostRoom) => {
    // The card already handles public joins; we only get here for locked rooms.
    if (room.isLocked && !joinedIds.includes(room.id)) {
      setPinDialogRoom(room);
    }
  };

  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <div className="relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 aurora-bg opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-start md:items-end justify-between gap-5"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 glass-subtle rounded-full text-xs mb-3">
                <Ghost className="size-3 text-violet-400" />
                <span>{t("Anonymous · ephemeral · safe")}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
                <span className="neon-text">{t("Ghost Rooms")}</span>
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                {t("Step into temporary spaces where identity vanishes and conversation gets real.")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <CreateGhostDialog>
                <Button variant="gradient" size="lg">
                  <Plus /> {t("Create room")}
                </Button>
              </CreateGhostDialog>
              <Button
                variant="glass"
                size="lg"
                onClick={() => setJoinByPinOpen(true)}
              >
                <KeyRound /> {t("Join with PIN")}
              </Button>
            </div>
          </motion.div>

          <div className="mt-8 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("Search ghost rooms")}
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button variant="glass" size="default" className="hidden md:inline-flex">
              <Share2 /> {t("Share my PIN")}
            </Button>
          </div>

          <Tabs defaultValue="trending" className="mt-6">
            <TabsList>
              <TabsTrigger value="trending">{t("Trending")}</TabsTrigger>
              <TabsTrigger value="new">{t("New")}</TabsTrigger>
              <TabsTrigger value="mine">{t("My rooms")}</TabsTrigger>
              <TabsTrigger value="joined">{t("Joined")}</TabsTrigger>
            </TabsList>

            <TabsContent value="trending" className="mt-6">
              <RoomGrid rooms={filtered} onJoin={handleJoinClick} />
            </TabsContent>
            <TabsContent value="new" className="mt-6">
              {newest.length > 0 ? (
                <RoomGrid rooms={newest} onJoin={handleJoinClick} />
              ) : (
                <EmptyHint title={t("No new rooms yet")} body={t("Be the first to open a fresh ghost room tonight.")} />
              )}
            </TabsContent>
            <TabsContent value="mine" className="mt-6">
              {mine.length > 0 ? (
                <RoomGrid rooms={mine} onJoin={handleJoinClick} />
              ) : (
                <EmptyHint
                  title={t("You have no rooms")}
                  body={t("Create one and share the PIN with the people who matter.")}
                />
              )}
            </TabsContent>
            <TabsContent value="joined" className="mt-6">
              {joined.length > 0 ? (
                <RoomGrid rooms={joined} onJoin={handleJoinClick} />
              ) : (
                <EmptyHint
                  title={t("Nothing joined yet")}
                  body={t("Hop into a trending room or punch in a PIN someone shared.")}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* PIN dialog for a specific locked room */}
      <JoinPinDialog
        open={pinDialogRoom !== null}
        onOpenChange={(v) => !v && setPinDialogRoom(null)}
        room={pinDialogRoom ?? undefined}
      />

      {/* Standalone "Join with PIN" — matches against any room */}
      <JoinPinDialog
        open={joinByPinOpen}
        onOpenChange={setJoinByPinOpen}
        onJoined={(room) => joinRoom(room.id)}
      />
    </ScrollArea>
  );
}

function RoomGrid({
  rooms,
  onJoin
}: {
  rooms: GhostRoom[];
  onJoin: (room: GhostRoom) => void;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } }
      }}
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    >
      {rooms.map((room) => (
        <motion.div
          key={room.id}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <GhostRoomCard room={room} onJoin={onJoin} />
        </motion.div>
      ))}
    </motion.div>
  );
}

function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-3xl p-12 text-center">
      <Ghost className="size-10 mx-auto text-muted-foreground" />
      <h3 className="font-semibold mt-3">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{body}</p>
    </div>
  );
}
