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
import { fontVariables } from "./fonts";
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_NAME = "Obsidian";
const SITE_TITLE = "Obsidian · The Future of Communication";
const SITE_DESCRIPTION =
  "Obsidian is a next-generation communication ecosystem — chats, ghost rooms, calls, stories, whiteboards and an internal browser, all in one futuristic OS for talking, building and connecting.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Obsidian"
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Obsidian Labs", url: SITE_URL }],
  creator: "Obsidian Labs",
  publisher: "Obsidian Labs",
  keywords: [
    "Obsidian",
    "secure messaging",
    "encrypted chat",
    "ghost rooms",
    "voice and video calls",
    "stories",
    "whiteboard",
    "communication OS",
    "privacy"
  ],
  category: "communication",
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: "/" },
  icons: {
    icon: "/Favicon.ico",
    shortcut: "/Favicon.ico",
    apple: "/Favicon.ico"
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
    images: [{ url: "/Background.jpg", alt: "Obsidian — the future of communication" }]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/Background.jpg"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a14" }
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jbMono.variable} ${indieFlower.variable} ${merienda.variable} ${caveat.variable} ${permanentMarker.variable} ${shadowsIntoLight.variable} ${fontVariables}`}
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
