"use client";

import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { AlertTriangle, Loader2, Send, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/sonner";

/**
 * Rippling-shape modal for an employee blocked from a pay run.
 * Two paths out:
 *
 *   • Add details        → deep-links straight to the employee edit
 *                          page with ?from=payroll-wizard&run=... so
 *                          the form scrolls to the missing inputs
 *                          and saves back to the run.
 *   • Request missing info → opens a stubbed email preview modal
 *                          (real email send is future work; today
 *                          it just toasts on Finish).
 */
export function MissingInfoModal({
  runId,
  employee,
  employeeName,
  missing,
  missingFieldnames,
  open,
  onClose,
}: {
  runId: string;
  employee: string;
  employeeName: string;
  missing: string[];
  missingFieldnames: string[];
  open: boolean;
  onClose: () => void;
}) {
  const [emailOpen, setEmailOpen] = useState(false);

  if (!open) return null;

  const editHref =
    `/employee/${encodeURIComponent(employee)}/edit?from=payroll-wizard&run=${encodeURIComponent(runId)}&fix=${missingFieldnames.join(",")}` as Route;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {employeeName}: Missing critical information
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Employee is missing details required to run payroll.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-4 space-y-1 text-sm">
          {missing.map((label) => (
            <li
              key={label}
              className="flex items-start gap-2 rounded px-1 py-0.5 text-rose-700"
            >
              <span aria-hidden className="mt-0.5">•</span>
              <span>Missing {label.toLowerCase()}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-muted/40"
          >
            <Send className="h-3.5 w-3.5" />
            Request missing info
          </button>
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Add details
          </Link>
        </div>
      </div>

      {emailOpen && (
        <RequestEmailModal
          employeeName={employeeName}
          missing={missing}
          onClose={() => setEmailOpen(false)}
          onFinish={() => {
            toast.success(
              `${employeeName} was emailed a request to fill in the missing info.`,
            );
            setEmailOpen(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}

function RequestEmailModal({
  employeeName,
  missing,
  onClose,
  onFinish,
}: {
  employeeName: string;
  missing: string[];
  onClose: () => void;
  onFinish: () => void;
}) {
  const [sending, setSending] = useState(false);
  const firstName = employeeName.split(" ")[0] ?? employeeName;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Request missing information
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              We&apos;ll email {employeeName} and ask them to fill in the
              missing information. You still won&apos;t be able to run
              payroll for them until they do it — or you add the details
              yourself.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-64 overflow-auto border-b p-5 text-sm">
          <p className="font-semibold text-foreground">Hi {firstName},</p>
          <p className="mt-3 text-muted-foreground">
            Your employer at Colossal HR needs some information from you in
            order to run payroll and get you paid. Specifically, we&apos;re
            missing the following information:
          </p>
          <ul className="mt-3 list-disc pl-5 text-muted-foreground">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={async () => {
              setSending(true);
              // Real send lands with the notifications module later —
              // for now the button confirms the flow.
              await new Promise((r) => setTimeout(r, 400));
              onFinish();
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60",
            )}
          >
            {sending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending…
              </>
            ) : (
              "Finish"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small trigger — the red / amber triangle icon that opens the
 *  modal on click. Renders inline; the parent controls open state.
 */
export function MissingInfoTriggerIcon({
  onClick,
  tone = "rose",
  title,
}: {
  onClick: () => void;
  tone?: "rose" | "amber";
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center rounded p-0.5 transition",
        tone === "rose"
          ? "text-rose-600 hover:bg-rose-50"
          : "text-amber-700 hover:bg-amber-50",
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
    </button>
  );
}
