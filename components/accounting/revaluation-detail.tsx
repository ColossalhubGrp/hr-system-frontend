"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, RefreshCcw, Send, Ban, Trash2 } from "lucide-react";
import {
  fetchBalancesAction,
  submitRevaluationAction,
  cancelRevaluationAction,
  deleteRevaluationAction,
} from "@/app/(workspace)/accounting/multi-currency/revaluation/actions";
import type { RevaluationAccount } from "@/lib/frappe/multi-currency/revaluation";
import { cn } from "@/lib/cn";

export function RevaluationDetail({
  name,
  docstatus,
  rows,
  totalGainLoss,
}: {
  name: string;
  docstatus: 0 | 1 | 2;
  rows: RevaluationAccount[];
  totalGainLoss: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  const isDraft = docstatus === 0;
  const isSubmitted = docstatus === 1;

  const runFetch = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await fetchBalancesAction(name);
      if (r?.error) setMsg({ kind: "err", text: r.error });
      else {
        setMsg({ kind: "ok", text: "Balances loaded." });
        router.refresh();
      }
    });
  };

  const runSubmit = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await submitRevaluationAction(name);
      if (r?.error) setMsg({ kind: "err", text: r.error });
      else { setMsg({ kind: "ok", text: "Submitted — Journal Entry posted." }); router.refresh(); }
    });
  };

  const runCancel = () => {
    if (!confirm("Cancel this revaluation? The Journal Entry it posted will be reversed.")) return;
    startTransition(async () => {
      const r = await cancelRevaluationAction(name);
      if (r?.error) setMsg({ kind: "err", text: r.error });
      else router.refresh();
    });
  };

  const runDelete = () => {
    if (!confirm(`Delete revaluation "${name}"?`)) return;
    startTransition(async () => {
      const r = await deleteRevaluationAction(name);
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
          <>
            <button type="button" onClick={runFetch} disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-input px-3 text-sm font-semibold hover:bg-muted/40 disabled:opacity-60">
              <RefreshCcw className="h-3.5 w-3.5" />
              Fetch balances
            </button>
            <button type="button" onClick={runSubmit} disabled={pending || rows.length === 0} className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white hover:bg-ink-700 disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />
              Submit
            </button>
          </>
        )}
        {isSubmitted && (
          <button type="button" onClick={runCancel} disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-destructive px-3 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-60">
            <Ban className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}
        {isDraft && (
          <button type="button" onClick={runDelete} disabled={pending} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-chip border border-destructive/30 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Foreign-currency balances</h2>
          <div className={cn("text-sm tabular-nums", totalGainLoss >= 0 ? "text-rise" : "text-fall")}>
            Net gain/loss <strong>{totalGainLoss.toFixed(2)}</strong>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing loaded yet. Click &ldquo;Fetch balances&rdquo; to pull every foreign-currency GL account.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left">Account</th>
                  <th className="py-2 text-left">Party</th>
                  <th className="py-2 text-left">Ccy</th>
                  <th className="py-2 text-right">Balance (fc)</th>
                  <th className="py-2 text-right">Cur. rate</th>
                  <th className="py-2 text-right">New rate</th>
                  <th className="py-2 text-right">Balance (base)</th>
                  <th className="py-2 text-right">New balance</th>
                  <th className="py-2 text-right">Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.idx} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-2 font-medium">{r.account}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.party ? `${r.partyType ?? ""} · ${r.party}` : "—"}</td>
                    <td className="py-2 pr-2 font-mono">{r.accountCurrency}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.balanceInAccountCurrency.toFixed(2)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.currentExchangeRate.toFixed(6)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.newExchangeRate.toFixed(6)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.balanceInBaseCurrency.toFixed(2)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.newBalanceInBaseCurrency.toFixed(2)}</td>
                    <td className={cn("py-2 pr-2 text-right tabular-nums font-semibold", r.gainLoss >= 0 ? "text-rise" : "text-fall")}>
                      {r.gainLoss.toFixed(2)}
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
