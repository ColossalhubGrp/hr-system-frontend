"use client";

import { AlertCircle, X } from "lucide-react";

/**
 * Error card for detail-page header actions (Submit / Cancel). The old
 * pattern squeezed a tiny red line next to the button; this renders a
 * proper readable alert that can hold a full backend sentence, with a
 * dismiss control.
 */
export function ActionError({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex w-full max-w-md items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left shadow-sm"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="flex-1 text-sm leading-relaxed text-destructive">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="rounded-md p-0.5 text-destructive/70 transition hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
