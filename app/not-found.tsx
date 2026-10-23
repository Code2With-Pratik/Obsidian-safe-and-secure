import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Ghost } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-dvh grid place-items-center px-6">
      <div className="absolute inset-0 -z-10 aurora-bg opacity-50" />
      <div className="text-center max-w-md">
        <div className="size-20 rounded-3xl mx-auto bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow">
          <Ghost className="size-9 text-white" />
        </div>
        <h1 className="mt-6 text-5xl font-display font-semibold tracking-tight">
          Lost in <span className="neon-text">the static</span>
        </h1>
        <p className="text-muted-foreground mt-3">
          The page or room you requested does not exist, may have moved, or is no longer
          available. Return home or use one of the public resources below.
        </p>
        <Button asChild size="lg" variant="gradient" className="mt-6">
          <Link href="/">Return home</Link>
        </Button>
        <nav aria-label="Error recovery" className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/about" className="text-primary hover:underline">About</Link>
          <Link href="/contact" className="text-primary hover:underline">Contact</Link>
          <a href="/llms.txt" className="text-primary hover:underline">Agent instructions</a>
          <a href="/sitemap.xml" className="text-primary hover:underline">Sitemap</a>
        </nav>
      </div>
    </div>
  );
}
