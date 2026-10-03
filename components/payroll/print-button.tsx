"use client";

import { Printer } from "lucide-react";

export function PrintButton({
  label = "Print",
  onBeforePrint,
}: {
  label?: string;
  /** Fires right before window.print(). Use for audit-logging the
   *  export; failures are swallowed so printing always happens. */
  onBeforePrint?: () => Promise<void> | void;
}) {
  async function handle() {
    if (onBeforePrint) {
      try { await onBeforePrint(); } catch { /* don't block the print */ }
    }
    window.print();
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 print:hidden"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
