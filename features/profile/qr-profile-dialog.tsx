"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import * as htmlToImage from "html-to-image";
import { ScanLine, Download, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { User } from "@/types";

interface Props {
  profile: User;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/** Style variants. Each pairs a background (gradient or solid) with an emoji
 *  used to tile a sparse "mesh" behind the QR — Instagram-card flavoured.
 *  The classic variant has no mesh (the plain white reads cleaner). */
interface Variant {
  id: string;
  label: string;
  bg: string;
  text: string;
  emoji?: string;
  /** Opacity of the emoji mesh on top of the background. */
  meshOpacity?: number;
}

const VARIANTS: Variant[] = [
  {
    id: "gradient",
    label: "Gradient",
    bg: "linear-gradient(135deg, #8B5CF6, #EC4899, #22D3EE)",
    text: "#ffffff",
    emoji: "🥰",
    meshOpacity: 0.55
  },
  {
    id: "sunset",
    label: "Sunset",
    bg: "linear-gradient(135deg, #F97316, #E11D48, #DB2777)",
    text: "#ffffff",
    emoji: "🌅",
    meshOpacity: 0.55
  },
  {
    id: "midnight",
    label: "Midnight",
    bg: "linear-gradient(135deg, #0F172A, #4338CA, #7C3AED)",
    text: "#ffffff",
    emoji: "💫",
    meshOpacity: 0.55
  },
  {
    id: "ocean",
    label: "Ocean",
    bg: "linear-gradient(135deg, #0EA5E9, #2563EB, #4338CA)",
    text: "#ffffff",
    emoji: "🌊",
    meshOpacity: 0.55
  },
  {
    id: "classic",
    label: "Classic",
    bg: "#ffffff",
    text: "#0F172A",
    emoji: "⭐",
    meshOpacity: 0.4
  }
];

const MESH_ROWS = 7;
const MESH_COLS = 5;

export function QrProfileDialog({ profile, open, onOpenChange }: Props) {
  const t = useT();
  const { toast } = useToast();
  const [variant, setVariant] = React.useState<Variant>(VARIANTS[0]);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) setVariant(VARIANTS[0]);
  }, [open]);

  // Encode the profile URL. In dev this resolves against the current origin;
  // in production it resolves against the real domain via metadataBase.
  const profileUrl = React.useMemo(() => {
    if (typeof window === "undefined") return `/profile`;
    return `${window.location.origin}/u/${profile.username}`;
  }, [profile.username]);

  const onDownload = async () => {
    if (!cardRef.current) return;
    try {
      // Capture at 2x pixel ratio so the downloaded PNG stays sharp on
      // retina/4K displays. html-to-image rasterises the DOM via foreignObject
      // SVG, so the gradient, emoji mesh, text and QR all bake into one file.
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true
      });
      const link = document.createElement("a");
      link.download = `${profile.username}-qr.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast({
        title: t("Couldn't save image"),
        description: String((err as Error)?.message ?? err)
      });
    }
  };

  const onScan = () => {
    // Real camera scanning is a follow-up (needs getUserMedia + a QR decoder
    // like jsQR or @zxing/browser). Acknowledged via toast for now.
    toast({
      title: t("Scan a QR code"),
      description: t("Camera scanning will open in a future update.")
    });
  };

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: profile.name, url: profileUrl });
      } else {
        await navigator.clipboard.writeText(profileUrl);
        toast({ title: t("Link copied"), description: profileUrl });
      }
    } catch {
      /* user cancelled — ignore */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw_-_2rem)] max-w-md p-0 overflow-hidden">
        <div className="max-h-[90vh] overflow-y-auto">
          <div className="p-6 pb-3">
            <DialogHeader>
              <DialogTitle className="text-xl font-display">{t("Profile QR")}</DialogTitle>
              <DialogDescription>
                {t("Scan to open")} <span className="font-medium">@{profile.username}</span>{" "}
                {t("instantly.")}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* The card we capture for the download. Everything visible inside
              this ref — gradient, emoji mesh, text and QR — is rasterised
              into a single PNG by html-to-image. */}
          <div className="px-6">
            <div
              ref={cardRef}
              className="relative rounded-3xl p-6 flex flex-col items-center overflow-hidden"
              style={{ background: variant.bg, color: variant.text }}
            >
              {/* Emoji mesh — a sparse rotated grid behind the QR. Disabled
                  for the classic variant where the clean white reads better. */}
              {variant.emoji && (
                <div
                  className="pointer-events-none select-none absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: `repeat(${MESH_COLS}, 1fr)`,
                    gridTemplateRows: `repeat(${MESH_ROWS}, 1fr)`,
                    opacity: variant.meshOpacity ?? 0.5
                  }}
                  aria-hidden
                >
                  {Array.from({ length: MESH_COLS * MESH_ROWS }).map((_, i) => {
                    // Deterministic but varied rotation/offset so the mesh
                    // reads organic rather than gridded.
                    const rot = (((i * 47) % 41) - 20).toString();
                    const tx = (((i * 13) % 11) - 5).toString();
                    const ty = (((i * 29) % 9) - 4).toString();
                    return (
                      <span
                        key={i}
                        className="flex items-center justify-center text-[36px] leading-none"
                        style={{
                          transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`
                        }}
                      >
                        {variant.emoji}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Foreground content sits above the mesh. */}
              <div className="relative w-full flex flex-col items-center">
                <p className="text-xs uppercase tracking-[0.2em] opacity-80">Obsidian</p>
                <p className="text-2xl font-display font-semibold tracking-tight mt-1 text-center">
                  {profile.name}
                </p>
                <p className="text-xs opacity-80">@{profile.username}</p>

                <div className="mt-5 bg-white p-3 rounded-2xl shadow-card">
                  <QRCodeSVG
                    value={profileUrl}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#0F172A"
                    level="M"
                  />
                </div>

                {/* Spacer that preserves the bottom breathing room where the
                    "Point your camera here" caption used to sit, so the QR
                    stays visually centred in the card without that text. */}
                <div aria-hidden className="mt-4 h-4" />
              </div>
            </div>
          </div>

          {/* Variant picker. */}
          <div className="px-6 mt-4">
            <div className="flex items-center gap-2 py-2 px-1 overflow-x-auto no-scrollbar">
              {VARIANTS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariant(v)}
                  className={cn(
                    "shrink-0 px-3 h-9 rounded-xl text-xs font-medium border border-white/10 transition",
                    variant.id === v.id
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : "opacity-90 hover:opacity-100"
                  )}
                  style={{ background: v.bg, color: v.text }}
                  aria-label={v.label}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/40 mt-4 gap-2 sm:gap-2 flex-row sm:flex-row">
            <Button variant="glass" onClick={onScan} className="flex-1">
              <ScanLine />
              {t("Scan QR")}
            </Button>
            <Button variant="glass" onClick={onShare} className="flex-1">
              <Share2 />
              {t("Share link")}
            </Button>
            <Button variant="gradient" onClick={onDownload}>
              <Download />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
