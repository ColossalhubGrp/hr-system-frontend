"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  DecisionState,
} from "@/app/(workspace)/hr/leaves/actions";

type Action = (prev: DecisionState) => Promise<DecisionState>;

const EMPTY: DecisionState = {};

export function LeaveDecisionBar({
  approve,
  reject,
}: {
  approve: Action;
  reject: Action;
}) {
  const [approveState, approveDispatch] = useFormState(approve, EMPTY);
  const [rejectState, rejectDispatch] = useFormState(reject, EMPTY);
  const error = approveState.error ?? rejectState.error;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-ash-900">Decide on this application</p>
        <p className="text-xs text-ash-500">
          Approving submits the doc and adjusts the employee's leave balance.
          Rejection is final but recoverable by HR.
        </p>
      </div>

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
          <DecisionButton tone="approve" pendingLabel="Approving…">
            <Check className="h-4 w-4" />
            Approve
          </DecisionButton>
        </form>
        <form action={rejectDispatch}>
          <DecisionButton tone="reject" pendingLabel="Rejecting…">
            <X className="h-4 w-4" />
            Reject
          </DecisionButton>
        </form>
      </div>
    </div>
  );
}

function DecisionButton({
  tone,
  pendingLabel,
  children,
}: {
  tone: "approve" | "reject";
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
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
