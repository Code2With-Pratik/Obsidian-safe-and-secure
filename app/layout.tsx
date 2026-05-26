import type { Metadata, Viewport } from "next";
import {
  Inter,
  JetBrains_Mono,
  Indie_Flower,
  Merienda,
  Caveat,
  Permanent_Marker,
  Shadows_Into_Light
} from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

/* Handwriting & display fonts used by the whiteboard text + sticky notes. */
const indieFlower = Indie_Flower({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-indie",
  display: "swap"
});
const merienda = Merienda({
  subsets: ["latin"],
  variable: "--font-merienda",
  display: "swap"
});
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
const permanentMarker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
  display: "swap"
});
const shadowsIntoLight = Shadows_Into_Light({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-shadows",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Nova · The Future of Communication",
  description:
    "Nova is a next-generation communication ecosystem — chats, ghost rooms, calls, stories, whiteboards and an internal browser, all in one futuristic OS for talking, building and connecting.",
  applicationName: "Nova",
  authors: [{ name: "Nova Labs" }]
};

export const viewport: Viewport = {
  themeColor: "#0b0a14",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jbMono.variable} ${indieFlower.variable} ${merienda.variable} ${caveat.variable} ${permanentMarker.variable} ${shadowsIntoLight.variable}`}
    >
      <body className="min-h-dvh font-sans antialiased">
        <AppProviders>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </AppProviders>
      </body>
    </html>
  );
}
