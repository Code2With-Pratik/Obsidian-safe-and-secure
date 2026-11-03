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
import { useLanguage, useT } from "@/lib/i18n";
import { LANGUAGES, useSettingsStore } from "@/store/use-settings-store";
import { LanguageFlag } from "@/components/language-flag";

export function LanguageThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = React.useState(false);
  const language = useLanguage();
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const t = useT();
  const currentLanguage =
    LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  React.useEffect(() => setThemeReady(true), []);

  return (
    <div className="fixed right-3 top-3 z-[100] flex items-center gap-1 rounded-xl border border-border/60 bg-background/85 p-1 shadow-lg backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        onClick={() =>
          setTheme(themeReady && resolvedTheme === "dark" ? "light" : "dark")
        }
        aria-label={t("Toggle theme")}
        title={t("Toggle theme")}
      >
        {themeReady && resolvedTheme === "dark" ? <Sun /> : <Moon />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2"
            aria-label={`Choose language, current language ${currentLanguage.nativeName}`}
            title="Choose language"
          >
            <LanguageFlag flag={currentLanguage.flag} />
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[180px] max-h-[320px] overflow-y-auto"
        >
          {LANGUAGES.map((item) => (
            <DropdownMenuItem
              key={item.code}
              onSelect={() => setLanguage(item.code)}
              className="gap-2.5"
            >
              <LanguageFlag flag={item.flag} />
              <span className="flex-1">{item.name}</span>
              {item.nativeName !== item.name && (
                <span className="text-xs text-muted-foreground">
                  {item.nativeName}
                </span>
              )}
              {language === item.code && (
                <Check className="size-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
