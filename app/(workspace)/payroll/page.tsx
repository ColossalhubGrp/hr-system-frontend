import Link from "next/link";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import {
  listPayRuns,
  listMissingCriticalInfo,
  type PayRunStatus,
} from "@/lib/payroll-engine/payruns";
import { NewPeriodModal } from "@/components/payroll/new-period-modal";
import { ActionRequiredBanner } from "@/components/payroll/action-required-banner";

export const metadata = { title: "Pay Runs · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

const STATUS_META: Record<PayRunStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-amber-100 text-amber-800" },
  PROCESSED: { label: "Processed", cls: "bg-blue-100 text-blue-800" },
  UPDATED: { label: "Updated (closed)", cls: "bg-emerald-100 text-emerald-700" },
};

const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function PayRunsPage() {
  const [periods, missing] = await Promise.all([
    listPayRuns(),
    listMissingCriticalInfo(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Pay Runs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each period flows: Open → Process → Update (close).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NewPeriodModal />
          <Link
            href={"/payroll/off-cycle" as Route}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40"
          >
            Create an off-cycle pay run
          </Link>
        </div>
      </header>

      <ActionRequiredBanner items={missing} />

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Period</TableHead>
              <TableHead className="px-5">Pay date</TableHead>
              <TableHead className="px-5">Rate</TableHead>
              <TableHead className="px-5 text-right">Employees</TableHead>
              <TableHead className="px-5 text-right">Net (USD)</TableHead>
              <TableHead className="px-5">Status</TableHead>
              <TableHead className="px-5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No pay runs yet. Click <strong>+ New pay period</strong> to open one.
                </TableCell>
              </TableRow>
            ) : (
              periods.map((p) => {
                const meta = STATUS_META[p.status];
                return (
                  <TableRow key={p.name}>
                    <TableCell className="px-5 align-middle">
                      <Link
                        href={`/payroll/${encodeURIComponent(p.name)}` as Route}
                        className="font-semibold text-primary hover:underline"
                      >
                        {p.period_label}
                      </Link>
                      {p.is_off_cycle ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          Off-cycle ·{" "}
                          {p.run_type[0] + p.run_type.slice(1).toLowerCase()}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-5 align-middle">{fmtDate(p.pay_date)}</TableCell>
                    <TableCell className="px-5 align-middle text-sm text-muted-foreground">
                      ZiG {p.exchange_rate.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-5 align-middle text-right">
                      {p.payslipCount || "—"}
                    </TableCell>
                    <TableCell className="px-5 align-middle text-right font-semibold">
                      {p.payslipCount ? usd(p.netUsdTotal) : "—"}
                    </TableCell>
                    <TableCell className="px-5 align-middle">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          meta.cls,
                        )}
                      >
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 align-middle text-right">
                      <Link
                        href={`/payroll/${encodeURIComponent(p.name)}` as Route}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {p.status === "OPEN" ? "Process →" : "View →"}
                      </Link>
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
