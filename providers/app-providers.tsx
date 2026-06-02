"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { QueryProvider } from "./query-provider";
import { CommandPalette } from "@/components/command-palette";
import { AIAssistant } from "@/components/ai-assistant";
import { SettingsEffects } from "@/components/settings-effects";
import { Toaster } from "@/components/ui/toaster";
import { StoryLayer } from "@/components/stories/story-layer";
import AuthListener from "@/components/auth-listener";
import { IncomingCallModal } from "@/features/calls/incoming-call-modal";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthListener />
        <SettingsEffects>
          <Toaster>
            {children}
            <CommandPalette />
            <AIAssistant />
            <StoryLayer />
            <IncomingCallModal />
          </Toaster>
        </SettingsEffects>
      </QueryProvider>
    </ThemeProvider>
  );
}
