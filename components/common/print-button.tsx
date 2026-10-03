"use client";

import { Printer } from "lucide-react";

/**
 * Generic Print button. Mirrors the one shipped under components/payroll
 * so other modules can print the same way without taking a payroll
 * dependency. Hidden on print.
 */
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
      className="inline-flex h-9 items-center justify-center gap-2 rounded-chip border border-input bg-transparent px-4 text-sm font-semibold text-foreground transition hover:bg-muted/40 focus-ring print:hidden"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
