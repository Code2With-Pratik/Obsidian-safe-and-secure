"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { QueryProvider } from "./query-provider";
import { CommandPalette } from "@/components/command-palette";
import { AIAssistant } from "@/components/ai-assistant";
import { SettingsEffects } from "@/components/settings-effects";
import { Toaster } from "@/components/ui/toaster";
import { StoryLayer } from "@/components/stories/story-layer";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SettingsEffects>
          <Toaster>
            {children}
            <CommandPalette />
            <AIAssistant />
            <StoryLayer />
          </Toaster>
        </SettingsEffects>
      </QueryProvider>
    </ThemeProvider>
  );
}
