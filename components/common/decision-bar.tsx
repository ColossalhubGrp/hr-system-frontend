"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type DecisionState = { error?: string };
type Action = (prev: DecisionState) => Promise<DecisionState>;
const EMPTY: DecisionState = {};

/**
 * Generic approve/reject bar used by every submittable workflow (leaves,
 * expense claims, shift requests, attendance requests, …). Wires two
 * independent `useFormState` actions and surfaces whichever errored most
 * recently.
 *
 * Migrated to shadcn primitives — approve button uses the `default` variant
 * (brand primary), reject uses `destructive` for clarity. Falls back to
 * `outline` for the reject if a less destructive feel is wanted later.
 */
export function DecisionBar({
  title,
  description,
  approve,
  reject,
  approveLabel = "Approve",
  rejectLabel = "Reject",
}: {
  title: string;
  description?: string;
  approve: Action;
  reject: Action;
  approveLabel?: string;
  rejectLabel?: string;
}) {
  const [approveState, approveDispatch] = useFormState(approve, EMPTY);
  const [rejectState, rejectDispatch] = useFormState(reject, EMPTY);
  const error = approveState.error ?? rejectState.error;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

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
            <ApproveBtn label={approveLabel} />
          </form>
          <form action={rejectDispatch}>
            <RejectBtn label={rejectLabel} />
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function ApproveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Check className="h-4 w-4" />
      {pending ? "Approving…" : label}
    </Button>
  );
}

function RejectBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending} className="border-destructive/40 text-destructive hover:bg-destructive/5">
      <X className="h-4 w-4" />
      {pending ? "Rejecting…" : label}
    </Button>
  );
}
