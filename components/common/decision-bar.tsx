"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type DecisionState = { error?: string };
type Action = (prev: DecisionState) => Promise<DecisionState>;
const EMPTY: DecisionState = {};

/** Optional lock context. When supplied and `canDecide === false`, the
 *  bar renders the buttons in a disabled state and surfaces a hint
 *  naming who the assigned approver is. Frappe HR gates approval to
 *  the specific user on the doc's approver field, so we surface that
 *  upfront instead of letting the user click through into an opaque
 *  permission error. */
export type LockContext = {
  canDecide: boolean;
  /** Human label for who CAN decide — e.g. "Le Crooks
   *  (le.crooks@fsbdemo.com)". Shown verbatim in the hint. */
  lockedToLabel?: string | null;
};

/**
 * Generic approve/reject bar used by every submittable workflow (leaves,
 * expense claims, shift requests, attendance requests, …). Wires two
 * independent `useFormState` actions and surfaces whichever errored most
 * recently.
 */
export function DecisionBar({
  title,
  description,
  approve,
  reject,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  lock,
}: {
  title: string;
  description?: string;
  approve: Action;
  reject: Action;
  approveLabel?: string;
  rejectLabel?: string;
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
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        {locked && lock?.lockedToLabel && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100/60 px-3 py-2 text-xs font-medium text-amber-900"
          >
            <Lock className="h-3.5 w-3.5 text-amber-700" />
            Only {lock.lockedToLabel} can approve or reject this.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <form action={approveDispatch}>
            <ApproveBtn label={approveLabel} disabled={locked} />
          </form>
          <form action={rejectDispatch}>
            <RejectBtn label={rejectLabel} disabled={locked} />
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

/** Turn Frappe's cryptic "does not have doctype access via role
 *  permission" throw into something a filer can actually act on. When
 *  we know who the approver is, name them; otherwise stay generic
 *  but at least drop the "doctype access" phrasing. */
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

function ApproveBtn({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      <Check className="h-4 w-4" />
      {pending ? "Approving…" : label}
    </Button>
  );
}

function RejectBtn({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending || disabled}
      className="border-destructive/40 text-destructive hover:bg-destructive/5"
    >
      <X className="h-4 w-4" />
      {pending ? "Rejecting…" : label}
    </Button>
  );
}
