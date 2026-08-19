"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteAction = (
  id: string,
  prev: { error?: string },
) => Promise<{ error?: string }>;

type Props = {
  action: DeleteAction;
  id: string;
  label: string;
  confirmTitle: string;
  confirmBody: string;
};

export function DeleteRecordButton({
  action,
  id,
  label,
  confirmTitle,
  confirmBody,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await action(id, {});
      if (res?.error) setError(res.error);
      // Success case: the Server Action redirects, so nothing to do here.
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="border-rose-200 text-rose-700 hover:bg-rose-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !isPending && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmBody}</DialogDescription>
          </DialogHeader>
          {error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Keep it
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
