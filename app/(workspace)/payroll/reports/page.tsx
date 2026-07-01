import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import type { Route } from "next";
import {
  listPayRuns,
  listPayslipsForRun,
} from "@/lib/payroll-engine/payruns";

export const metadata = { title: "Reports · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

const num = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type SP = { from?: string; to?: string; status?: string };

export default async function ReportsTab({
  searchParams,
}: {
  searchParams: SP;
}) {
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 6, 1)
    .toISOString()
    .slice(0, 10);
  const from = (searchParams.from || defaultFrom).slice(0, 10);
  const to = (searchParams.to || defaultTo).slice(0, 10);
  const statusFilter = (searchParams.status || "all").toLowerCase();

  const allRuns = await listPayRuns();
  // Belina pay-run statuses: OPEN → PROCESSED → UPDATED. "Processed
  // or later" means "everything with numbers on it".
  let filtered = allRuns;
  if (statusFilter === "processed") {
    filtered = filtered.filter((r) => r.status === "PROCESSED" || r.status === "UPDATED");
  } else if (statusFilter === "updated") {
    filtered = filtered.filter((r) => r.status === "UPDATED");
  } else if (statusFilter === "open") {
    filtered = filtered.filter((r) => r.status === "OPEN");
  }
  filtered = filtered.filter((r) => {
    if (!r.pay_date) return false;
    const pd = r.pay_date.slice(0, 10);
    return pd >= from && pd <= to;
  });

  // Only fetch payslips for runs actually processed — OPEN runs have
  // none and would waste round-trips. Cap at 50 for the summary page.
  const slipsByRun = await Promise.all(
    filtered.slice(0, 50).map(async (r) => ({
      run: r,
      slips: r.status === "OPEN" ? [] : await listPayslipsForRun(r.name),
    })),
  );
  const all = slipsByRun.flatMap((x) => x.slips);
  const totalGross = all.reduce((s, x) => s + x.gross_usd, 0);
  const totalNet = all.reduce((s, x) => s + x.net_usd, 0);
  const totalDed = totalGross - totalNet;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-foreground">
          Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length} run{filtered.length === 1 ? "" : "s"} matching ·{" "}
          {all.length} payslip{all.length === 1 ? "" : "s"}
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs font-medium text-muted-foreground">
            From
          </label>
          <input
            type="date"
            id="from"
            name="from"
            defaultValue={from}
            className="h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs font-medium text-muted-foreground">
            To
          </label>
          <input
            type="date"
            id="to"
            name="to"
            defaultValue={to}
            className="h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={statusFilter}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="processed">Processed or later</option>
            <option value="updated">Updated (closed)</option>
            <option value="open">Open</option>
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Filter
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Tile label="Runs in range" value={String(filtered.length)} />
        <Tile label="Gross USD" value={num(totalGross)} />
        <Tile label="Deductions USD" value={num(totalDed)} />
        <Tile label="Net USD" value={num(totalNet)} />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Run</TableHead>
              <TableHead className="px-5">Pay date</TableHead>
              <TableHead className="px-5">Status</TableHead>
              <TableHead className="px-5 text-right">Payslips</TableHead>
              <TableHead className="px-5 text-right">Gross USD</TableHead>
              <TableHead className="px-5 text-right">Deductions USD</TableHead>
              <TableHead className="px-5 text-right">Net USD</TableHead>
              <TableHead className="px-5 text-right">Net ZiG</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slipsByRun.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  No pay runs match the current filter. Widen the date
                  range or change the status.
                </TableCell>
              </TableRow>
            ) : (
              slipsByRun.map(({ run, slips }) => {
                const g = slips.reduce((s, x) => s + x.gross_usd, 0);
                const n = slips.reduce((s, x) => s + x.net_usd, 0);
                const nz = slips.reduce((s, x) => s + x.net_zig, 0);
                const d = g - n;
                return (
                  <TableRow key={run.name}>
                    <TableCell className="px-5 align-middle">
                      <Link
                        href={`/payroll/${encodeURIComponent(run.name)}` as Route}
                        className="font-semibold text-primary hover:underline"
                      >
                        {run.period_label}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {run.name}
                        {run.is_off_cycle ? ` · ${run.run_type}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="px-5 align-middle text-muted-foreground">
                      {fmtDate(run.pay_date)}
                    </TableCell>
                    <TableCell className="px-5 align-middle">
                      <StatusPill status={run.status} />
                    </TableCell>
                    <TableCell className="px-5 text-right align-middle">
                      {slips.length || "—"}
                    </TableCell>
                    <TableCell className="px-5 text-right align-middle">
                      {g ? num(g) : "—"}
                    </TableCell>
                    <TableCell className="px-5 text-right align-middle text-muted-foreground">
                      {d ? num(d) : "—"}
                    </TableCell>
                    <TableCell className="px-5 text-right align-middle font-semibold">
                      {n ? num(n) : "—"}
                    </TableCell>
                    <TableCell className="px-5 text-right align-middle font-semibold">
                      {nz ? num(nz) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "UPDATED"
      ? "bg-emerald-100 text-emerald-700"
      : status === "PROCESSED"
        ? "bg-primary/10 text-primary"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status[0] + status.slice(1).toLowerCase()}
    </span>
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
