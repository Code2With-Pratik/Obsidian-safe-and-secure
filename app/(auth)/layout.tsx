"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, ChevronDown, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LANGUAGES, useSettingsStore } from "@/store/use-settings-store";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const currentLanguage = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background" />
      <div className="absolute right-4 top-4 z-50 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
          title="Toggle theme"
        >
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 px-2"
              aria-label={`Choose language, current language ${currentLanguage.label}`}
              title="Choose language"
            >
              <span className="text-base leading-none">{currentLanguage.flag}</span>
              <span className="text-xs font-medium uppercase">{currentLanguage.code}</span>
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[320px] overflow-y-auto">
            {LANGUAGES.map((item) => (
              <DropdownMenuItem
                key={item.code}
                onSelect={() => setLanguage(item.code)}
                className="gap-2.5"
              >
                <span className="text-lg leading-none">{item.flag}</span>
                <span className="flex-1">{item.label}</span>
                {language === item.code && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children}
    </div>
  );
}
