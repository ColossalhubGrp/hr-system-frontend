"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
 *   UPDATED    → read-only pill, plus [Reopen for editing] iff caller
 *                is a Payroll Manager (canReopenClosed).
 *
 * Each action toasts on success/failure and disables itself while pending.
 */
export function PayRunActions({
  id,
  status,
  canReopenClosed = false,
}: {
  id: string;
  status: "OPEN" | "PROCESSED" | "UPDATED";
  /** Payroll Manager only — allows a closed (UPDATED) run to be
   *  bounced back to OPEN for corrections. */
  canReopenClosed?: boolean;
}) {
  if (status === "UPDATED") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          Run closed — read-only.
        </span>
        {canReopenClosed && (
          <RunButton
            id={id}
            action={reopenPeriod}
            label="Reopen for editing"
            pendingLabel="Reopening…"
            success="Pay run reopened — status is now Open."
            kind="ghost"
            confirm={{
              title: "Reopen closed pay run?",
              description:
                "This bounces the run back to Open so you can edit wizard entries and re-process. Existing payslips stay in place until the run is processed again. Only Payroll Managers can do this.",
              actionLabel: "Reopen run",
            }}
          />
        )}
      </div>
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

type ConfirmSpec = {
  title: string;
  description: string;
  actionLabel: string;
};

function RunButton({
  id,
  action,
  label,
  pendingLabel,
  success,
  kind,
  confirm,
}: {
  id: string;
  action: (id: string) => Promise<void>;
  label: string;
  pendingLabel: string;
  success: string;
  kind: "primary" | "ghost";
  confirm?: ConfirmSpec;
}) {
  const [pending, start] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  function run() {
    start(async () => {
      try {
        await action(id);
        toast.success(success);
      } catch (err) {
        const msg = (err as { message?: string })?.message ?? "Action failed.";
        toast.error(msg);
      }
    });
  }

  const cls =
    kind === "primary"
      ? "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      : "inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60";

  const content = pending ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      {pendingLabel}
    </>
  ) : (
    label
  );

  if (!confirm) {
    return (
      <button type="button" onClick={run} disabled={pending} className={cls}>
        {content}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={pending}
        className={cls}
      >
        {content}
      </button>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setDialogOpen(false);
                run();
              }}
              disabled={pending}
            >
              {confirm.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
