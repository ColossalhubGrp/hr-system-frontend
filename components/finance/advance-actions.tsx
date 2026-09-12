"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { submitAdvanceAction, cancelAdvanceAction } from "@/app/(workspace)/hr/employee-advances/actions";

export function AdvanceActionsBar({
  id,
  docstatus,
}: {
  id: string;
  docstatus: 0 | 1 | 2;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (docstatus === 2) {
    return <p className="text-xs text-ash-500">This advance is cancelled.</p>;
  }

  const onSubmit = () =>
    start(async () => {
      const r = await submitAdvanceAction(id);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });

  const onCancel = () =>
    start(async () => {
      if (!window.confirm("Cancel this advance? This will reverse GL entries.")) return;
      const r = await cancelAdvanceAction(id);
      if (!r.ok) window.alert(r.error);
      else router.refresh();
    });

  return (
    <div className="flex items-center gap-2">
      {docstatus === 0 && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          {pending ? "Working…" : "Submit"}
        </button>
      )}
      {docstatus === 1 && (
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-sm font-medium text-ash-800 transition hover:bg-canvas focus-ring disabled:opacity-60"
        >
          <X className="h-4 w-4" />
          {pending ? "Working…" : "Cancel advance"}
        </button>
      )}
    </div>
  );
}
