"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw, X } from "lucide-react";
import {
  cancelOvertimeSlipAction,
  fetchOvertimeDetailsAction,
  submitOvertimeSlipAction,
} from "@/app/(workspace)/hr/overtime-slips/actions";

export function OvertimeSlipActions({
  id,
  docstatus,
}: {
  id: string;
  docstatus: 0 | 1 | 2;
}) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  if (docstatus === 2) {
    return <p className="text-xs text-ash-500">This slip is cancelled.</p>;
  }

  const onFetch = () =>
    start(async () => {
      const r = await fetchOvertimeDetailsAction(id);
      if (!r.ok) setStatus(r.error);
      else {
        setStatus(`Loaded ${r.rows} attendance row${r.rows === 1 ? "" : "s"}.`);
        router.refresh();
      }
    });
  const onSubmit = () =>
    start(async () => {
      const r = await submitOvertimeSlipAction(id);
      if (!r.ok) setStatus(r.error);
      else router.refresh();
    });
  const onCancel = () =>
    start(async () => {
      if (!window.confirm("Cancel this overtime slip? Will reverse Additional Salary if posted.")) return;
      const r = await cancelOvertimeSlipAction(id);
      if (!r.ok) setStatus(r.error);
      else router.refresh();
    });

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {docstatus === 0 && (
          <>
            <button
              type="button"
              onClick={onFetch}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-sm font-medium text-ash-800 transition hover:bg-canvas focus-ring disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              {pending ? "Fetching…" : "Fetch overtime"}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {pending ? "Working…" : "Submit"}
            </button>
          </>
        )}
        {docstatus === 1 && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-sm font-medium text-ash-800 transition hover:bg-canvas focus-ring disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            {pending ? "Working…" : "Cancel slip"}
          </button>
        )}
      </div>
      {status && <p className="text-xs text-ash-500">{status}</p>}
    </div>
  );
}
