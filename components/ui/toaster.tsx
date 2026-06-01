"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  /** Visual variant — defaults to "default". `destructive` paints with the
   *  rose palette for errors / dangerous outcomes. */
  variant?: "default" | "destructive" | "success";
}

const ToastContext = React.createContext<{
  toast: (t: Omit<ToastItem, "id">) => void;
}>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = `t-${Date.now()}`;
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              "glass-strong border border-border/60 rounded-xl p-4 pr-10 shadow-floating",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full",
              "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full"
            )}
          >
            <ToastPrimitive.Title className="text-sm font-semibold">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="text-xs text-muted-foreground mt-1">
                {t.description}
              </ToastPrimitive.Description>
            )}
            <ToastPrimitive.Close className="absolute right-2 top-2 opacity-60 hover:opacity-100">
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-96 max-w-full flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export { ToastProvider as Toaster };
