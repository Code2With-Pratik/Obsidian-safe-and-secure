"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Ghost, KeyRound, Plus, Search, Share2 } from "lucide-react";
import { GhostRoomCard } from "@/features/ghost/ghost-room-card";
import { CreateGhostDialog } from "@/features/ghost/create-ghost-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ghostRooms } from "@/lib/mock-data";

export default function GhostRoomsPage() {
  const [q, setQ] = React.useState("");
  const filtered = ghostRooms.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));

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
                <span>Anonymous · ephemeral · safe</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
                Ghost <span className="neon-text">Rooms</span>
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Step into temporary spaces where identity vanishes and conversation gets real.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <CreateGhostDialog>
                <Button variant="gradient" size="lg">
                  <Plus /> Create room
                </Button>
              </CreateGhostDialog>
              <Button variant="glass" size="lg">
                <KeyRound /> Join with PIN
              </Button>
            </div>
          </motion.div>

          <div className="mt-8 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search ghost rooms"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button variant="glass" size="default" className="hidden md:inline-flex">
              <Share2 /> Share my PIN
            </Button>
          </div>

          <Tabs defaultValue="trending" className="mt-6">
            <TabsList>
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="mine">My rooms</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            </TabsList>

            <TabsContent value="trending" className="mt-6">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.05 } }
                }}
                className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filtered.map((room) => (
                  <motion.div
                    key={room.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <GhostRoomCard room={room} />
                  </motion.div>
                ))}
              </motion.div>
            </TabsContent>

            <TabsContent value="new" className="mt-6">
              <EmptyHint title="No new rooms yet" body="Be the first to open a fresh ghost room tonight." />
            </TabsContent>
            <TabsContent value="mine" className="mt-6">
              <EmptyHint
                title="You have no rooms"
                body="Create one and share the PIN with the people who matter."
              />
            </TabsContent>
            <TabsContent value="scheduled" className="mt-6">
              <EmptyHint
                title="Nothing scheduled"
                body="Schedule a ghost room for later and we'll notify your invitees."
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ScrollArea>
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
