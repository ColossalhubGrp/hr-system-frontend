"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Link2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { linkAdvanceAction, unlinkAdvanceAction } from "@/app/(workspace)/hr/expense-claims/actions";

type Linked = {
  employee_advance: string;
  posting_date: string | null;
  advance_paid: number;
  unclaimed_amount: number;
  allocated_amount: number;
};
type Available = {
  name: string;
  unclaimed: number;
  currency: string | null;
  postingDate: string;
  purpose: string | null;
};

export function AdvancesPanel({
  claimId,
  docstatus,
  linked,
  available,
  sanctioned,
  currency,
}: {
  claimId: string;
  docstatus: 0 | 1 | 2;
  linked: Linked[];
  available: Available[];
  sanctioned: number;
  currency: string | null;
}) {
  const editable = docstatus === 0;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<string>(available[0]?.name ?? "");
  const [amount, setAmount] = useState<string>(
    String(
      Math.min(sanctioned, available[0]?.unclaimed ?? 0) || "",
    ),
  );
  const router = useRouter();

  const alreadyLinkedIds = new Set(linked.map((r) => r.employee_advance));
  const availableToShow = available.filter((a) => !alreadyLinkedIds.has(a.name));

  const totalAllocated = linked.reduce((a, r) => a + r.allocated_amount, 0);
  const outstanding = Math.max(0, sanctioned - totalAllocated);

  const onLink = () => {
    setError(null);
    const amt = Number(amount);
    if (!pick || !Number.isFinite(amt) || amt <= 0) {
      setError("Pick an advance and set an amount above zero.");
      return;
    }
    start(async () => {
      const r = await linkAdvanceAction(claimId, pick, amt);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };
  const onUnlink = (adv: string) => {
    if (!window.confirm(`Unlink advance ${adv} from this claim?`)) return;
    start(async () => {
      const r = await unlinkAdvanceAction(claimId, adv);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
          Linked advances
        </h2>
        <p className="text-xs text-ash-500">
          {fmtMoney(totalAllocated, currency)} allocated ·{" "}
          {fmtMoney(outstanding, currency)} remaining vs sanctioned{" "}
          {fmtMoney(sanctioned, currency)}
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-3 flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {linked.length === 0 ? (
        <p className="rounded-md border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-500">
          No advances linked.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-medium uppercase tracking-wide text-ash-500">
            <tr className="border-b border-hairline">
              <th className="px-3 py-2">Advance</th>
              <th className="px-3 py-2">Posted</th>
              <th className="px-3 py-2 text-right">Paid</th>
              <th className="px-3 py-2 text-right">Unclaimed</th>
              <th className="px-3 py-2 text-right">Allocated</th>
              {editable && <th className="w-16 px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {linked.map((r) => (
              <tr key={r.employee_advance} className="border-b border-hairline last:border-b-0">
                <td className="px-3 py-2">
                  <Link
                    href={`/hr/employee-advances/${encodeURIComponent(r.employee_advance)}` as Route}
                    className="text-ink-800 hover:underline"
                  >
                    {r.employee_advance}
                  </Link>
                </td>
                <td className="px-3 py-2 text-ash-700">
                  {r.posting_date ? fmtDate(r.posting_date) : "—"}
                </td>
                <td className="px-3 py-2 text-right text-ash-800">
                  {fmtMoney(r.advance_paid, currency)}
                </td>
                <td className="px-3 py-2 text-right text-ash-800">
                  {fmtMoney(r.unclaimed_amount, currency)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-ink-900">
                  {fmtMoney(r.allocated_amount, currency)}
                </td>
                {editable && (
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onUnlink(r.employee_advance)}
                      disabled={pending}
                      className="inline-flex h-8 items-center gap-1 rounded-chip border border-hairline px-2 text-xs text-fall hover:bg-fall/[0.06] focus-ring disabled:opacity-60"
                    >
                      <Trash2 className="h-3 w-3" />
                      Unlink
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editable && availableToShow.length > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-card border border-hairline bg-canvas/40 p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ash-500">Advance</label>
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="h-9 min-w-[280px] rounded-chip border border-hairline bg-surface px-2 text-sm"
            >
              {availableToShow.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} — {fmtMoney(a.unclaimed, a.currency)} unclaimed
                  {a.purpose ? ` — ${a.purpose}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ash-500">Allocate</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 w-32 rounded-chip border border-hairline bg-surface px-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={onLink}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {pending ? "Linking…" : "Link advance"}
          </button>
        </div>
      )}
      {editable && availableToShow.length === 0 && linked.length === 0 && (
        <p className="mt-3 text-xs text-ash-500">
          This employee has no unclaimed advances.{" "}
          <Link href={"/hr/employee-advances/new" as Route} className="text-ink-800 underline">
            Create one
          </Link>
          .
        </p>
      )}
    </section>
  );
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtMoney(n: number, ccy: string | null) {
  if (!Number.isFinite(n)) return "—";
  const num = n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return ccy ? `${ccy} ${num}` : num;
}
