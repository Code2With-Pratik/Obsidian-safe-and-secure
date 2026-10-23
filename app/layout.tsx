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
import {
  getStructuredData,
  ORGANIZATION_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL
} from "@/lib/site-config";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: ORGANIZATION_NAME, url: SITE_URL }],
  creator: ORGANIZATION_NAME,
  publisher: ORGANIZATION_NAME,
  keywords: [
    "Obsidian Safe & Secure messaging",
    "Obsidian Safe & Secure",
    "Obsidian communication platform",
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
    images: [
      { url: "/og-default.jpg", width: 800, height: 393, alt: "Obsidian — the future of communication" }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-default.jpg"]
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
    { media: "(prefers-color-scheme: dark)", color: "#000000" }
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = JSON.stringify(getStructuredData()).replace(/</g, "\\u003c");

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jbMono.variable} ${indieFlower.variable} ${merienda.variable} ${caveat.variable} ${permanentMarker.variable} ${shadowsIntoLight.variable} ${fontVariables}`}
    >
      <head>
        <link rel="alternate" type="text/markdown" href="/" />
        <link rel="help" href="/llms.txt" />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
        <AppProviders>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </AppProviders>
      </body>
    </html>
  );
}
