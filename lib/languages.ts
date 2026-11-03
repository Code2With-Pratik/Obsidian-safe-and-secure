export const LANGUAGE_COOKIE_NAME = "obsidian-language";
export const LANGUAGE_BROADCAST_CHANNEL = "obsidian-language";
export const SETTINGS_STORAGE_KEY = "nova-settings";

export const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" }
] as const;

export type SupportedLanguage = (typeof LANGUAGES)[number]["code"];
export type Language = (typeof LANGUAGES)[number];

export const RTL_LANGS: ReadonlySet<SupportedLanguage> = new Set(["ar"]);

export function normalizeLanguageCode(value: unknown): SupportedLanguage | null {
  if (typeof value !== "string") return null;

  const code = value.trim().toLowerCase().split(/[-_]/, 1)[0];
  return LANGUAGES.find((language) => language.code === code)?.code ?? null;
}
