import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Clock, Plus, CheckCircle2, XCircle } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { listOvertimeRules } from "@/lib/frappe/overtime";

export const metadata = {
  title: "Overtime rules · Settings · Colossal HR",
};

export default async function OvertimeRulesPage() {
  await requireGroup("HR_ADMIN", "/settings/overtime");
  const rules = await listOvertimeRules();
  const active = rules.filter((r) => r.isActive).length;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to settings
      </Link>

      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <Clock className="h-3.5 w-3.5" />
            Settings · Overtime rules
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Overtime rules
          </h1>
          <p className="text-sm text-ash-600">
            {rules.length} rule{rules.length === 1 ? "" : "s"} · {active} active.
            Rules are versioned — editing creates the next effective version
            so historical payslips don't shift.
          </p>
        </div>
        <Link
          href={"/settings/overtime/new" as Route}
          className="mt-3 inline-flex h-10 w-fit items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring sm:mt-0"
        >
          <Plus className="h-4 w-4" />
          New rule
        </Link>
      </header>

      {rules.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-6 py-10 text-center text-sm text-ash-600">
          No overtime rules yet. Start with a global default and override as
          needed.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Rule</th>
                <th className="px-4 py-2.5 text-left font-medium">Threshold</th>
                <th className="px-4 py-2.5 text-left font-medium">Method</th>
                <th className="px-4 py-2.5 text-left font-medium">Validity</th>
                <th className="px-4 py-2.5 text-left font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/40">
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/settings/overtime/${encodeURIComponent(r.id)}` as Route}
                      className="font-medium text-ink-800 hover:underline"
                    >
                      {r.ruleName}
                    </Link>
                    <div className="text-xs text-ash-500">{r.id}</div>
                  </td>
                  <td className="px-4 py-3 text-ash-700">
                    {r.thresholdValue} {unitFor(r.thresholdType)}
                    <div className="text-xs text-ash-500">{r.thresholdType}</div>
                  </td>
                  <td className="px-4 py-3 text-ash-700">{r.calculationMethod}</td>
                  <td className="px-4 py-3 text-xs text-ash-700">
                    {fmtDate(r.validFrom)} → {fmtDate(r.validTo) ?? "open"}
                  </td>
                  <td className="px-4 py-3">
                    {r.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-chip bg-rise/10 px-2 py-0.5 text-[11px] font-medium text-rise">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-chip bg-ash-200/40 px-2 py-0.5 text-[11px] font-medium text-ash-700">
                        <XCircle className="h-3 w-3" /> Disabled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function unitFor(t: string): string {
  if (t === "Daily Hours" || t === "Weekly Hours" || t === "Shift Based") return "h";
  if (t === "Consecutive Days") return "days";
  return "";
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
