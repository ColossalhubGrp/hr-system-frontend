"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DecisionState } from "@/app/(workspace)/hr/expense-claims/actions";

type Action = (prev: DecisionState) => Promise<DecisionState>;
const EMPTY: DecisionState = {};

export function ExpenseDecisionBar({
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
      <div>
        <p className="text-sm font-medium text-ash-900">Decide on this claim</p>
        <p className="text-xs text-ash-500">
          Approving submits the doc and posts the sanctioned amount; rejection
          submits with status set to Rejected.
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
          <Btn tone="approve" pendingLabel="Approving…">
            <Check className="h-4 w-4" />
            Approve
          </Btn>
        </form>
        <form action={rejectDispatch}>
          <Btn tone="reject" pendingLabel="Rejecting…">
            <X className="h-4 w-4" />
            Reject
          </Btn>
        </form>
      </div>
    </div>
  );
}

function Btn({
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
