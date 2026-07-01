"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emailPayslipsAction } from "@/app/(workspace)/payroll/actions";

/**
 * "Email payslips" button on the pay-run detail page. Renders different
 * states (idle → confirming → sending → result).
 *
 * The actual send is queued via Frappe's Email Queue, so this returns
 * fast — the count it reports is "queued", not "delivered." Delivery
 * status is visible in each Salary Slip's Communications timeline.
 */
export function EmailPayslipsButton({
  payRunId,
  slipCount,
}: {
  payRunId: string;
  slipCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<null | {
    sent: number;
    skipped: number;
    failed: number;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setError(null);
    start(async () => {
      const r = await emailPayslipsAction(payRunId);
      if (r.error) {
        setError(r.error);
        return;
      }
      setResult(r.result ?? null);
      setConfirming(false);
    });
  }

  if (result) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        <span className="font-semibold">
          Queued {result.sent} email{result.sent === 1 ? "" : "s"}
          {result.skipped > 0 ? ` · skipped ${result.skipped}` : ""}
          {result.failed > 0 ? ` · failed ${result.failed}` : ""}
        </span>
      </div>
    );
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        disabled={slipCount === 0}
      >
        <Mail className="h-3.5 w-3.5" />
        Email payslips
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
      <span>
        Email {slipCount} payslip{slipCount === 1 ? "" : "s"}?
      </span>
      <Button size="sm" onClick={send} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Sending…
          </>
        ) : (
          "Yes, send"
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Cancel
      </Button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
