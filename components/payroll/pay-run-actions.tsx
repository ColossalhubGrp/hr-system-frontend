"use client";

import Link from "next/link";
import type { Route } from "next";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  updatePeriod,
  reopenPeriod,
} from "@/app/(workspace)/payroll/payruns-actions";

/**
 * Process / Update (close) / Reopen buttons for the Payroll Run
 * detail page. Visibility depends on status:
 *
 *   OPEN       → [Process payroll]
 *   PROCESSED  → [Update — close run]  [Reopen]
 *   UPDATED    → (no actions)
 *
 * Each action toasts on success/failure and disables itself while pending.
 */
export function PayRunActions({
  id,
  status,
}: {
  id: string;
  status: "OPEN" | "PROCESSED" | "UPDATED";
}) {
  if (status === "UPDATED") {
    return (
      <span className="text-xs text-muted-foreground">
        Run closed — read-only.
      </span>
    );
  }

  if (status === "OPEN") {
    // Process is now driven by the wizard at /payroll/[id]/run — the
    // wizard collects per-class adjustments + shows a comparison
    // preview, then hits processPeriod on Approve.
    return (
      <Link
        href={`/payroll/${encodeURIComponent(id)}/run` as Route}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Run payroll →
      </Link>
    );
  }

  // PROCESSED
  return (
    <div className="flex items-center gap-2">
      <RunButton
        id={id}
        action={updatePeriod}
        label="Update — close run"
        pendingLabel="Closing…"
        success="Pay run closed."
        kind="primary"
      />
      <RunButton
        id={id}
        action={reopenPeriod}
        label="Reopen"
        pendingLabel="Reopening…"
        success="Pay run reopened."
        kind="ghost"
      />
    </div>
  );
}

function RunButton({
  id,
  action,
  label,
  pendingLabel,
  success,
  kind,
}: {
  id: string;
  action: (id: string) => Promise<void>;
  label: string;
  pendingLabel: string;
  success: string;
  kind: "primary" | "ghost";
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          try {
            await action(id);
            toast.success(success);
          } catch (err) {
            const msg = (err as { message?: string })?.message ?? "Action failed.";
            toast.error(msg);
          }
        })
      }
      disabled={pending}
      className={
        kind === "primary"
          ? "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          : "inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
      }
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
