"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { QueryProvider } from "./query-provider";
import { CommandPalette } from "@/components/command-palette";
import { AIAssistant } from "@/components/ai-assistant";
import { Toaster } from "@/components/ui/toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <Toaster>
          {children}
          <CommandPalette />
          <AIAssistant />
        </Toaster>
      </QueryProvider>
    </ThemeProvider>
  );
}
