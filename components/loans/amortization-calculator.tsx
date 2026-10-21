"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

type Row = {
  month: number;
  date: string;
  openingBalance: number;
  interest: number;
  principal: number;
  payment: number;
  closingBalance: number;
};

/**
 * Standard flat-amortization (reducing-balance) EMI table. Given a
 * principal, an annual rate and a tenure in months, computes the
 * fixed monthly payment and splits it into interest + principal for
 * each month so the outstanding capital balance drops over time.
 *
 * Pure client component — no backend. Used both standalone (via the
 * /loans/schedule page) and inline on a loan detail page.
 */
export function AmortizationCalculator({
  defaultPrincipal = 0,
  defaultRatePct = 10,
  defaultMonths = 12,
  defaultStart = new Date().toISOString().slice(0, 10),
}: {
  defaultPrincipal?: number;
  defaultRatePct?: number;
  defaultMonths?: number;
  defaultStart?: string;
}) {
  const [principal, setPrincipal] = useState<number>(defaultPrincipal);
  const [ratePct, setRatePct] = useState<number>(defaultRatePct);
  const [months, setMonths] = useState<number>(defaultMonths);
  const [start, setStart] = useState<string>(defaultStart);

  const schedule = useMemo<Row[]>(() => computeSchedule(principal, ratePct, months, start), [principal, ratePct, months, start]);
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const totalPaid = schedule.reduce((s, r) => s + r.payment, 0);
  const monthlyPayment = schedule[0]?.payment ?? 0;

  function downloadCsv() {
    const header = ["Month", "Date", "Opening balance", "Interest", "Principal", "Payment", "Closing balance"];
    const lines = [header.join(",")];
    for (const r of schedule) {
      lines.push([r.month, r.date, r.openingBalance.toFixed(2), r.interest.toFixed(2), r.principal.toFixed(2), r.payment.toFixed(2), r.closingBalance.toFixed(2)].join(","));
    }
    const csv = lines.join("\n") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `loan-schedule-${principal}-${ratePct}pct-${months}m.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-5">
        <Field label="Principal (USD)">
          <input type="number" min={0} step={0.01} value={principal || ""} onChange={(e) => setPrincipal(Number(e.target.value) || 0)} className="h-8 w-full rounded-md border border-input bg-card px-2 text-[13px] focus-ring" />
        </Field>
        <Field label="Annual rate %">
          <input type="number" min={0} step={0.01} value={ratePct} onChange={(e) => setRatePct(Number(e.target.value) || 0)} className="h-8 w-full rounded-md border border-input bg-card px-2 text-[13px] focus-ring" />
        </Field>
        <Field label="Tenure (months)">
          <input type="number" min={1} step={1} value={months} onChange={(e) => setMonths(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="h-8 w-full rounded-md border border-input bg-card px-2 text-[13px] focus-ring" />
        </Field>
        <Field label="Start date">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 w-full rounded-md border border-input bg-card px-2 text-[13px] focus-ring" />
        </Field>
        <div className="flex items-end">
          <button type="button" onClick={downloadCsv} disabled={schedule.length === 0} className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium hover:border-primary/40 disabled:opacity-60">
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label="Monthly payment" value={fmt(monthlyPayment)} />
        <Tile label="Total interest" value={fmt(totalInterest)} />
        <Tile label="Total paid back" value={fmt(totalPaid)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Opening balance</th>
              <th className="px-3 py-2 text-right">Interest</th>
              <th className="px-3 py-2 text-right">Principal</th>
              <th className="px-3 py-2 text-right">Payment</th>
              <th className="px-3 py-2 text-right">Closing balance</th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Enter principal, rate and tenure to see the schedule.
                </td>
              </tr>
            )}
            {schedule.map((r) => (
              <tr key={r.month} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                <td className="px-3 py-1.5 tabular-nums text-foreground">{r.month}</td>
                <td className="px-3 py-1.5 tabular-nums text-foreground">{r.date}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-foreground">{fmt(r.openingBalance)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">{fmt(r.interest)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{fmt(r.principal)}</td>
                <td className="px-3 py-1.5 text-right font-medium tabular-nums text-foreground">{fmt(r.payment)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmt(r.closingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function computeSchedule(principal: number, annualRatePct: number, months: number, startISO: string): Row[] {
  if (principal <= 0 || months <= 0) return [];
  const monthlyRate = (annualRatePct / 100) / 12;
  // Standard EMI formula (reducing balance). When rate = 0, degenerate
  // to equal principal splits so the user doesn't divide by zero.
  const emi = monthlyRate > 0
    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : principal / months;

  const rows: Row[] = [];
  let balance = principal;
  // Parse start date; roll by exact calendar month, not 30-day periods.
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const base = new Date(sy || 2026, (sm || 1) - 1, sd || 1);
  for (let i = 0; i < months; i++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.max(0, emi - interest);
    const payment = i === months - 1 ? balance + interest : emi;
    const actualPrincipal = payment - interest;
    const date = new Date(base.getFullYear(), base.getMonth() + i, base.getDate());
    const dateIso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const closing = Math.max(0, balance - actualPrincipal);
    rows.push({
      month: i + 1,
      date: dateIso,
      openingBalance: balance,
      interest,
      principal: actualPrincipal,
      payment,
      closingBalance: closing,
    });
    balance = closing;
    void principalPaid;
  }
  return rows;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="text-lg font-bold tabular-nums leading-tight">{value}</span>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
