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
import { LanguageProvider } from "@/lib/i18n";
import type { SupportedLanguage } from "@/lib/languages";

export function AppProviders({
  children,
  initialLanguage
}: {
  children: React.ReactNode;
  initialLanguage: SupportedLanguage | null;
}) {
  return (
    <LanguageProvider initialLanguage={initialLanguage}>
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
    </LanguageProvider>
  );
}
