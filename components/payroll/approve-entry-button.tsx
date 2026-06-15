"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { approvePayrollEntryAction } from "@/app/(workspace)/payroll/review/actions";

/**
 * Single-action button for Finance Reviewers / Payroll Officers to submit a
 * draft Payroll Entry. Submits via Server Action so the page revalidates and
 * the row disappears from the queue when approval succeeds.
 */
export function ApprovePayrollEntryButton({ entryId }: { entryId: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function onClick() {
    setErr(null);
    start(async () => {
      const res = await approvePayrollEntryAction(entryId);
      if ("ok" in res && res.ok) {
        setOk(true);
      } else if ("error" in res) {
        setErr(res.error);
      }
    });
  }

  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-chip bg-rise/10 px-2 py-1 text-[11px] font-medium text-rise">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approved
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-chip bg-ink-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-700 disabled:opacity-60 focus-ring"
      >
        {pending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Approving…
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </>
        )}
      </button>
      {err && (
        <p className="flex items-center gap-1 text-[11px] text-fall">
          <AlertCircle className="h-3 w-3" />
          {err}
        </p>
      )}
    </div>
  );
}
