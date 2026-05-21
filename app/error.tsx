"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="size-16 mx-auto rounded-2xl bg-rose-500/15 text-rose-400 grid place-items-center">
          <AlertTriangle />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Something cosmic went sideways</h1>
        <p className="text-muted-foreground mt-2">
          Don't worry — it's not you. We've logged the issue and will look into it.
        </p>
        <Button onClick={reset} variant="gradient" className="mt-5">
          <RotateCw /> Try again
        </Button>
      </div>
    </div>
  );
}
