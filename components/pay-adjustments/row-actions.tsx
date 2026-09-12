"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import {
  cancelAdjustmentAction,
  submitAdjustmentAction,
} from "@/app/(workspace)/payroll/adjustments/actions";
import type { AdjustmentDoctype } from "@/lib/frappe/pay-adjustments";

export function AdjustmentRowActions({
  doctype,
  name,
  docstatus,
}: {
  doctype: AdjustmentDoctype;
  name: string;
  docstatus: 0 | 1 | 2;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (docstatus === 2) {
    return <span className="text-xs text-ash-500">Cancelled</span>;
  }
  return (
    <div className="flex items-center justify-end gap-1">
      {docstatus === 0 && (
        <button
          type="button"
          onClick={() =>
            start(async () => {
              const r = await submitAdjustmentAction(doctype, name);
              if (!r.ok) window.alert(r.error);
              else router.refresh();
            })
          }
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-chip bg-ink-800 px-2.5 text-xs font-semibold text-white hover:bg-ink-700 focus-ring disabled:opacity-60"
          title="Submit"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Submit
        </button>
      )}
      {docstatus === 1 && (
        <button
          type="button"
          onClick={() =>
            start(async () => {
              if (
                !window.confirm(
                  `Cancel this ${doctype.toLowerCase()}? Related Additional Salary rows are reversed.`,
                )
              )
                return;
              const r = await cancelAdjustmentAction(doctype, name);
              if (!r.ok) window.alert(r.error);
              else router.refresh();
            })
          }
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-chip border border-hairline bg-surface px-2.5 text-xs font-medium text-ash-800 hover:bg-canvas focus-ring disabled:opacity-60"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      )}
    </div>
  );
}
