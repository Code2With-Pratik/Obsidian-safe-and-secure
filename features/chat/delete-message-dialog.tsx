"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * Shared "Delete message(s)" confirmation. Offers:
 *  - **Delete for me** — always available; soft-hide for the current user.
 *  - **Delete for everyone** — only when every selected message is the
 *    user's own; hard-deletes the rows in the DB.
 *  - **Cancel** — close.
 */
export function DeleteMessageDialog({
  open,
  count,
  canDeleteForEveryone,
  onClose,
  onDeleteForMe,
  onDeleteForEveryone
}: {
  open: boolean;
  /** How many messages will be affected — used for the title pluralization. */
  count: number;
  /** True only when every selected message was authored by the current user. */
  canDeleteForEveryone: boolean;
  onClose: () => void;
  onDeleteForMe: () => void | Promise<void>;
  onDeleteForEveryone: () => void | Promise<void>;
}) {
  const t = useT();
  if (count <= 0) return null;
  const titleKey = count === 1 ? "Delete message?" : "Delete messages?";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-1 size-12 rounded-2xl bg-rose-500/15 text-rose-500 grid place-items-center">
            <Trash2 className="size-5" />
          </div>
          <DialogTitle className="text-center">{t(titleKey)}</DialogTitle>
          <DialogDescription className="text-center">
            {canDeleteForEveryone
              ? t("You can delete this for everyone, or just for yourself.")
              : t("This will only be deleted on your side. Others will still see it.")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-2">
          {canDeleteForEveryone && (
            <Button
              variant="destructive"
              onClick={() => {
                void onDeleteForEveryone();
              }}
            >
              {t("Delete for everyone")}
            </Button>
          )}
          <Button
            variant="glass"
            onClick={() => {
              void onDeleteForMe();
            }}
          >
            {t("Delete for me")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
