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
          The room you're looking for vanished. Or maybe it was a ghost.
        </p>
        <Button asChild size="lg" variant="gradient" className="mt-6">
          <Link href="/chats">Back to chats</Link>
        </Button>
      </div>
    </div>
  );
}
