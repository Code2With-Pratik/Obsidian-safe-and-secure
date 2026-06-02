"use client";

import * as React from "react";
import { ShareProfileSheet } from "@/features/chat/share-profile-sheet";
import type { User } from "@/types";

interface Props {
  /** The profile being shared. */
  profile: User;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Profile page wrapper around the shared `ShareProfileSheet` — uses the same
 * UI (app badges + copy-link + contact search) as the chat-details share
 * surface so the experience is consistent across the app.
 */
export function ShareProfileDialog({ profile, open, onOpenChange }: Props) {
  return (
    <ShareProfileSheet
      open={open}
      onClose={() => onOpenChange(false)}
      profile={{
        id: profile.id,
        name: profile.name,
        username: profile.username,
        avatar: profile.avatar,
        banner: profile.banner
      }}
    />
  );
}
