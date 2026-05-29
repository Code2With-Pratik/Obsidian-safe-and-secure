import {
  Arima,
  Doto,
  Grape_Nuts,
  Lora,
  Montserrat_Alternates,
  Noto_Color_Emoji,
  Poppins,
  Satisfy
} from "next/font/google";

/**
 * User-selectable display fonts. Each is self-hosted by `next/font` and exposed
 * through a `--font-<id>` CSS variable. All variables are mounted on <html> (see
 * `fontVariables`); the active one is wired into `--font-sans` / `--font-display`
 * at runtime by SettingsEffects based on the "Font" appearance setting.
 *
 * Variable fonts (Arima, Doto, Lora) load their full weight axis. Static fonts
 * (Montserrat Alternates, Poppins) load the weights the app actually uses —
 * normal/medium/semibold/bold. Grape Nuts ships a single 400 weight.
 */

export const arima = Arima({
  subsets: ["latin"],
  variable: "--font-arima",
  display: "swap"
});

export const doto = Doto({
  subsets: ["latin"],
  variable: "--font-doto",
  display: "swap"
});

export const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap"
});

export const grapeNuts = Grape_Nuts({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-grape-nuts",
  display: "swap"
});

export const satisfy = Satisfy({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-satisfy",
  display: "swap"
});

export const montserratAlternates = Montserrat_Alternates({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-montserrat-alt",
  display: "swap"
});

export const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap"
});

/**
 * Self-hosted color-emoji font. The OS emoji font (e.g. Windows' Segoe UI
 * Emoji) only covers older Unicode emoji, so newer ones render as tofu (□).
 * Rendering emoji with this bundled font instead makes the full set show
 * consistently on every platform. Exposed as `--font-emoji` and used first in
 * the emoji font stack.
 */
export const notoColorEmoji = Noto_Color_Emoji({
  weight: "400",
  subsets: ["emoji"],
  variable: "--font-emoji",
  display: "swap"
});

/** Concrete family string (CSS vars don't resolve in <canvas>) for baking
 *  emoji stickers into the exported story PNG. */
export const emojiFontFamily = notoColorEmoji.style.fontFamily;

/** Space-joined `.variable` classNames, applied together on <html> so every
 *  `--font-*` token is live and selectable without a reload. */
export const fontVariables = [
  arima.variable,
  doto.variable,
  lora.variable,
  grapeNuts.variable,
  satisfy.variable,
  montserratAlternates.variable,
  poppins.variable,
  notoColorEmoji.variable
].join(" ");

export interface FontOption {
  /** Stable id; also the suffix of its CSS variable (`--font-<id>`), except
   *  "default" which means "leave the app's base Inter alone". */
  id: string;
  label: string;
  /** Concrete family string for rendering each option in its own typeface. */
  family: string;
}

export const DEFAULT_FONT = "default";

// Listed alphabetically by label (A→Z); new fonts stay sorted automatically.
export const FONT_OPTIONS: FontOption[] = [
  { id: DEFAULT_FONT, label: "Inter (Default)", family: "var(--font-sans)" },
  { id: "poppins", label: "Poppins", family: poppins.style.fontFamily },
  { id: "montserrat-alt", label: "Montserrat Alternates", family: montserratAlternates.style.fontFamily },
  { id: "lora", label: "Lora", family: lora.style.fontFamily },
  { id: "arima", label: "Arima", family: arima.style.fontFamily },
  { id: "doto", label: "Doto", family: doto.style.fontFamily },
  { id: "grape-nuts", label: "Grape Nuts", family: grapeNuts.style.fontFamily },
  { id: "satisfy", label: "Satisfy", family: satisfy.style.fontFamily }
].sort((a, b) => a.label.localeCompare(b.label));
