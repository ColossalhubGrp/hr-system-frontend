"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Send, Ban, Trash2 } from "lucide-react";
import {
  submitPeriodClosingAction,
  cancelPeriodClosingAction,
  deletePeriodClosingAction,
} from "@/app/(workspace)/accounting/tools/period-close/actions";
import { cn } from "@/lib/cn";

export function PeriodClosingDetail({ name, docstatus }: { name: string; docstatus: 0 | 1 | 2 }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  const isDraft = docstatus === 0;
  const isSubmitted = docstatus === 1;

  const runSubmit = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await submitPeriodClosingAction(name);
      if (r?.error) setMsg({ kind: "err", text: r.error });
      else { setMsg({ kind: "ok", text: "Submitted — closing Journal Entry posted." }); router.refresh(); }
    });
  };

  const runCancel = () => {
    if (!confirm("Cancel this period closing? The Journal Entry it posted will be reversed.")) return;
    startTransition(async () => {
      const r = await cancelPeriodClosingAction(name);
      if (r?.error) setMsg({ kind: "err", text: r.error });
      else router.refresh();
    });
  };

  const runDelete = () => {
    if (!confirm(`Delete voucher "${name}"?`)) return;
    startTransition(async () => {
      const r = await deletePeriodClosingAction(name);
      if (r?.error) setMsg({ kind: "err", text: r.error });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {msg && (
        <div className={cn("flex items-start gap-2 rounded-xl border p-3 text-sm", msg.kind === "err" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-rise/30 bg-rise/5 text-rise")}>
          {msg.kind === "err" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <div>{msg.text}</div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {isDraft && (
          <button type="button" onClick={runSubmit} disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white hover:bg-ink-700 disabled:opacity-60">
            <Send className="h-3.5 w-3.5" /> Submit
          </button>
        )}
        {isSubmitted && (
          <button type="button" onClick={runCancel} disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-destructive px-3 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-60">
            <Ban className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
        {isDraft && (
          <button type="button" onClick={runDelete} disabled={pending} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-chip border border-destructive/30 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
