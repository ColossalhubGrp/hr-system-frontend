"use client";

import { Printer, X } from "lucide-react";

/** Floating controls on dedicated print-document pages. Hidden on paper. */
export function PrintPageControls() {
  return (
    <div className="fixed right-4 top-4 flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-ink-700"
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="inline-flex h-10 items-center gap-2 rounded-chip border border-input bg-white px-4 text-sm font-semibold text-foreground shadow-lg transition hover:bg-muted/40"
      >
        <X className="h-4 w-4" />
        Close
      </button>
    </div>
  );
}
