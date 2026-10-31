"use client";

import { Printer } from "lucide-react";

/** Compact icon-only print control rendered on every PageHeader. */
export function PagePrintAction() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label="Print this page"
      title="Print this page"
      className="inline-flex h-9 w-9 items-center justify-center rounded-chip border border-input text-muted-foreground transition hover:bg-muted/40 hover:text-foreground focus-ring print:hidden"
    >
      <Printer className="h-4 w-4" />
    </button>
  );
}
