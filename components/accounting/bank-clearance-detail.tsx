"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, RefreshCcw, Save, Send, Trash2 } from "lucide-react";
import { TextInput } from "@/components/employee/form-bits";
import {
  loadPaymentsAction,
  saveDatesAction,
  submitClearanceAction,
  deleteClearanceAction,
} from "@/app/(workspace)/accounting/banking/clearance/actions";
import type { ClearanceRow } from "@/lib/frappe/banking/bank-clearance";
import { cn } from "@/lib/cn";

export function BankClearanceDetail({
  name,
  initialRows,
  docstatus,
}: {
  name: string;
  initialRows: ClearanceRow[];
  docstatus: 0 | 1 | 2;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ClearanceRow[]>(initialRows);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  const runLoad = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await loadPaymentsAction(name);
      if (r?.error) setMsg({ kind: "err", text: r.error });
      else {
        setMsg({ kind: "ok", text: "Loaded pending payments." });
        router.refresh();
      }
    });
  };

  const runSave = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await saveDatesAction(name, rows.map((x) => ({ idx: x.idx, clearanceDate: x.clearanceDate || null })));
      if (r?.error) setMsg({ kind: "err", text: r.error });
      else setMsg({ kind: "ok", text: "Saved clearance dates." });
    });
  };

  const runSubmit = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await submitClearanceAction(name);
      if (r?.error) setMsg({ kind: "err", text: r.error });
      else {
        setMsg({ kind: "ok", text: "Cleared — updates posted to each voucher." });
        router.refresh();
      }
    });
  };

  const runDelete = () => {
    if (!confirm(`Delete clearance batch "${name}"?`)) return;
    startTransition(async () => {
      const r = await deleteClearanceAction(name);
      if (r?.error) setMsg({ kind: "err", text: r.error });
    });
  };

  const isDraft = docstatus === 0;

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
          <>
            <button type="button" onClick={runLoad} disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-input px-3 text-sm font-semibold hover:bg-muted/40 disabled:opacity-60">
              <RefreshCcw className="h-3.5 w-3.5" />
              Load pending payments
            </button>
            <button type="button" onClick={runSave} disabled={pending || rows.length === 0} className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-input px-3 text-sm font-semibold hover:bg-muted/40 disabled:opacity-60">
              <Save className="h-3.5 w-3.5" />
              Save dates
            </button>
            <button type="button" onClick={runSubmit} disabled={pending || rows.length === 0} className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white hover:bg-ink-700 disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />
              Post clearance
            </button>
          </>
        )}
        <button type="button" onClick={runDelete} disabled={pending} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-chip border border-destructive/30 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payments</h2>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing loaded yet. Hit &ldquo;Load pending payments&rdquo; to pull vouchers in the date range that haven&rsquo;t been cleared.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left">Voucher</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Posting date</th>
                  <th className="py-2 text-left">Ref no.</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-left">Clearance date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={`${r.paymentDocument}-${r.paymentEntry}-${idx}`} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-2 font-mono text-xs">{r.paymentEntry}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.paymentDocument}</td>
                    <td className="py-2 pr-2">{r.postingDate}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.chequeNumber ?? "—"}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.amount.toFixed(2)}</td>
                    <td className="py-2 pr-2">
                      <TextInput
                        type="date"
                        value={r.clearanceDate ?? ""}
                        onChange={(e) => setRows((p) => p.map((x) => (x.idx === r.idx ? { ...x, clearanceDate: e.target.value } : x)))}
                        disabled={!isDraft}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
