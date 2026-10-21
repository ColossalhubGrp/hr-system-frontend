import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, LineChart, Search, Download } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "Earnings & Deductions · Payroll · Colossal ERP" };
export const dynamic = "force-dynamic";

type SP = { from?: string; to?: string; kind?: "EARNING" | "DEDUCTION" | "BOTH" };

type Txn = {
  employee: string;
  employee_name: string;
  code: string;
  currency: string;
  amount: number;
  kind: "EARNING" | "DEDUCTION";
  pay_date: string;
};

export default async function EarningsDeductionsReportPage({ searchParams }: { searchParams: SP }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayISO = today.toISOString().slice(0, 10);
  const from = searchParams.from || monthStart;
  const to = searchParams.to || todayISO;
  const kindFilter = (searchParams.kind || "BOTH") as "EARNING" | "DEDUCTION" | "BOTH";

  let txns: Txn[] = [];
  let error: string | null = null;
  try {
    txns = await loadTxns(from, to, kindFilter);
  } catch (e) {
    error =
      e instanceof FrappeRequestError
        ? e.message || `Backend error (${e.status})`
        : e instanceof Error
        ? e.message
        : "Could not run the report.";
  }

  // Pivot: rows = employees, columns = component codes, cells = sum amount.
  // Separate earnings and deductions so one grid can show both groups
  // without the user confusing a tax deduction for a bonus earning.
  const pivot = buildPivot(txns);
  const csvHref = `/payroll/reports/earnings-deductions/export?${new URLSearchParams({ from, to, kind: kindFilter }).toString()}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={"/payroll/reports" as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Reports
        </Link>
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">— Payroll</div>
        <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Earnings & deductions
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Every captured earning and deduction in the date range, pivoted per employee × component.
        </p>
      </div>

      <form action="/payroll/reports/earnings-deductions" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <Field label="From" name="from" type="date" value={from} />
        <Field label="To" name="to" type="date" value={to} />
        <Field label="Show" name="kind" type="select" value={kindFilter} options={["BOTH", "EARNING", "DEDUCTION"]} />
        <div className="ml-auto flex items-end gap-2">
          <a
            href={csvHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground hover:border-primary/40 hover:text-primary"
          >
            <Download className="h-3 w-3" />
            CSV
          </a>
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Search className="h-3 w-3" />
            Run
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}

      {!error && txns.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No captured earnings or deductions in this range.
        </div>
      )}

      {pivot.earnings.rows.length > 0 && (
        <Grid
          title="Earnings"
          icon={<LineChart className="h-3.5 w-3.5" />}
          rows={pivot.earnings.rows}
          codes={pivot.earnings.codes}
        />
      )}
      {pivot.deductions.rows.length > 0 && (
        <Grid
          title="Deductions"
          icon={<LineChart className="h-3.5 w-3.5" />}
          rows={pivot.deductions.rows}
          codes={pivot.deductions.codes}
        />
      )}
    </div>
  );
}

async function loadTxns(from: string, to: string, kind: "EARNING" | "DEDUCTION" | "BOTH"): Promise<Txn[]> {
  // First fetch Payroll Run names in the date range so we filter the
  // potentially-huge Payroll Transaction set by pay-date membership.
  const runs = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Payroll Run",
      fields: ["name", "pay_date"],
      filters: [["pay_date", "between", [from, to]]],
      limit_page_length: 500,
      order_by: "pay_date asc",
    },
  });
  const runNames = runs.map((r) => String(r.name ?? ""));
  const payDateByRun = new Map(runs.map((r) => [String(r.name ?? ""), String(r.pay_date ?? "")]));
  if (runNames.length === 0) return [];

  const txnFilters: Array<[string, string, unknown]> = [["payroll_run", "in", runNames]];
  if (kind !== "BOTH") txnFilters.push(["kind", "=", kind]);

  const raw = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Payroll Transaction",
      fields: ["employee", "employee_name", "code", "currency", "amount", "kind", "payroll_run"],
      filters: txnFilters,
      limit_page_length: 5000,
    },
  });
  return raw.map((r) => ({
    employee: String(r.employee ?? ""),
    employee_name: String(r.employee_name ?? r.employee ?? ""),
    code: String(r.code ?? "—"),
    currency: String(r.currency ?? "USD"),
    amount: Number(r.amount ?? 0),
    kind: (String(r.kind ?? "EARNING") as "EARNING" | "DEDUCTION"),
    pay_date: payDateByRun.get(String(r.payroll_run ?? "")) || "",
  }));
}

type PivotRow = { employee: string; name: string; cells: Record<string, number>; total: number };
type PivotGroup = { rows: PivotRow[]; codes: string[] };

function buildPivot(txns: Txn[]): { earnings: PivotGroup; deductions: PivotGroup } {
  const earnings = pivotByKind(txns.filter((t) => t.kind === "EARNING"));
  const deductions = pivotByKind(txns.filter((t) => t.kind === "DEDUCTION"));
  return { earnings, deductions };
}

function pivotByKind(txns: Txn[]): PivotGroup {
  const codes = Array.from(new Set(txns.map((t) => t.code))).sort();
  const empMap = new Map<string, PivotRow>();
  for (const t of txns) {
    let row = empMap.get(t.employee);
    if (!row) {
      row = { employee: t.employee, name: t.employee_name, cells: {}, total: 0 };
      empMap.set(t.employee, row);
    }
    row.cells[t.code] = (row.cells[t.code] ?? 0) + t.amount;
    row.total += t.amount;
  }
  const rows = Array.from(empMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  return { codes, rows };
}

function Grid({ title, icon, rows, codes }: { title: string; icon: React.ReactNode; rows: PivotRow[]; codes: string[] }) {
  // Column totals printed in a trailing <tfoot> so the user can see
  // per-component total payout alongside the per-employee row totals.
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;
  for (const r of rows) {
    for (const c of codes) {
      const v = r.cells[c] ?? 0;
      colTotals[c] = (colTotals[c] ?? 0) + v;
      grandTotal += v;
    }
  }
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {title}
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="border-b border-border bg-muted/30 text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="sticky left-0 bg-muted/30 px-3 py-2">Employee</th>
              {codes.map((c) => (
                <th key={c} className="px-3 py-2 text-right">{c}</th>
              ))}
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.employee} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                <td className="sticky left-0 bg-card px-3 py-2 font-medium text-foreground">{r.name}</td>
                {codes.map((c) => (
                  <td key={c} className="px-3 py-2 text-right tabular-nums text-foreground">
                    {num(r.cells[c] ?? 0)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{num(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-muted/40 text-[12.5px]">
            <tr>
              <td className="sticky left-0 bg-muted/40 px-3 py-2 font-semibold uppercase tracking-wider text-muted-foreground">Total</td>
              {codes.map((c) => (
                <td key={c} className="px-3 py-2 text-right font-semibold tabular-nums">{num(colTotals[c] ?? 0)}</td>
              ))}
              <td className="px-3 py-2 text-right font-bold tabular-nums">{num(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function Field({ label, name, type, value, options }: { label: string; name: string; type: "date" | "select"; value: string; options?: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      {type === "select" ? (
        <select id={name} name={name} defaultValue={value} className="h-8 rounded-md border border-input bg-card px-2 text-[13px] focus-ring">
          {options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input id={name} name={name} type="date" defaultValue={value} className="h-8 rounded-md border border-input bg-card px-2 text-[13px] focus-ring" />
      )}
    </div>
  );
}

const num = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
