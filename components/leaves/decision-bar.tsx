"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  DecisionState,
} from "@/app/(workspace)/hr/leaves/actions";

type Action = (prev: DecisionState) => Promise<DecisionState>;

const EMPTY: DecisionState = {};

/** Optional lock context surfacing who the assigned approver is.
 *  Frappe HR limits approval to the specific user on
 *  leave_approver, so we disable the buttons + name that person
 *  upfront rather than letting the filer click through into an
 *  opaque doctype-permission error. */
export type LockContext = {
  canDecide: boolean;
  lockedToLabel?: string | null;
};

export function LeaveDecisionBar({
  approve,
  reject,
  lock,
}: {
  approve: Action;
  reject: Action;
  lock?: LockContext;
}) {
  const [approveState, approveDispatch] = useFormState(approve, EMPTY);
  const [rejectState, rejectDispatch] = useFormState(reject, EMPTY);
  const rawError = approveState.error ?? rejectState.error;
  const error = rawError
    ? translatePermissionError(rawError, lock?.lockedToLabel ?? null)
    : null;
  const locked = lock ? !lock.canDecide : false;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-ash-900">Decide on this application</p>
        <p className="text-xs text-ash-500">
          Approving submits the doc and adjusts the employee's leave balance.
          Rejection is final but recoverable by HR.
        </p>
      </div>

      {locked && lock?.lockedToLabel && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-100/60 px-3 py-2 text-xs font-medium text-amber-900"
        >
          <Lock className="h-3.5 w-3.5 text-amber-700" />
          Only {lock.lockedToLabel} can approve or reject this.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <form action={approveDispatch}>
          <DecisionButton tone="approve" pendingLabel="Approving…" disabled={locked}>
            <Check className="h-4 w-4" />
            Approve
          </DecisionButton>
        </form>
        <form action={rejectDispatch}>
          <DecisionButton tone="reject" pendingLabel="Rejecting…" disabled={locked}>
            <X className="h-4 w-4" />
            Reject
          </DecisionButton>
        </form>
      </div>
    </div>
  );
}

function translatePermissionError(
  raw: string,
  lockedToLabel: string | null,
): string {
  const isPerm = /does not have doctype access via role permission/i.test(raw);
  if (!isPerm) return raw;
  if (lockedToLabel) {
    return `Only ${lockedToLabel} can approve or reject this.`;
  }
  return "Only the assigned approver can act on this request.";
}

function DecisionButton({
  tone,
  pendingLabel,
  disabled,
  children,
}: {
  tone: "approve" | "reject";
  pendingLabel: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold transition focus-ring",
        tone === "approve"
          ? "bg-rise text-white hover:bg-rise/90"
          : "bg-surface text-fall border border-fall/40 hover:bg-fall/[0.06]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
