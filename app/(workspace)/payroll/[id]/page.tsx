import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import {
  getPayRun,
  listEmployeesForRun,
  listPayslipsForRun,
  listPreviousRunNetMap,
  type PayRunStatus,
} from "@/lib/payroll-engine/payruns";
import { FlowSteps } from "@/components/payroll/flow-steps";
import { PayRunActions } from "@/components/payroll/pay-run-actions";
import { DeltaTag } from "@/components/payroll/delta-tag";
import { CaptureTransactionForm } from "@/components/payroll/capture-transaction-form";
import { listTxnCodes } from "@/lib/payroll-engine/setup";

export const metadata = { title: "Pay run · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

const STATUS_META: Record<PayRunStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-amber-100 text-amber-800" },
  PROCESSED: { label: "Processed", cls: "bg-blue-100 text-blue-800" },
  UPDATED: { label: "Updated (closed)", cls: "bg-emerald-100 text-emerald-700" },
};

const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const zig = (n: number) =>
  `ZiG ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Plain formatted number for cells whose column header already names
// the currency (e.g. "Basic USD" / "Net ZiG"). Drops the symbol so it
// isn't repeated on every row.
const num = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default async function PayRunDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { exists?: string; offcycle?: string };
}) {
  const id = decodeURIComponent(params.id);
  const run = await getPayRun(id);
  if (!run) notFound();

  const meta = STATUS_META[run.status];
  const isOpen = run.status === "OPEN";

  // OPEN view needs the active-employees table + codes (for per-row
  // Capture); PROCESSED view needs the payslips + previous-run net
  // map for the DeltaTag.
  const [employees, codes, slips, prev] = await Promise.all([
    isOpen ? listEmployeesForRun(id) : Promise.resolve([]),
    isOpen ? listTxnCodes() : Promise.resolve([]),
    isOpen ? Promise.resolve([]) : listPayslipsForRun(id),
    isOpen ? Promise.resolve({ byEmployee: new Map<string, number>(), total: 0, label: null }) : listPreviousRunNetMap(id),
  ]);
  const codeOptions = codes.map((c) => ({
    code: c.code,
    kind: c.kind,
    default_currency: c.default_currency ?? "USD",
    taxable: Boolean(c.taxable),
  }));

  const tot = slips.reduce(
    (a, s) => ({
      grossUsd: a.grossUsd + s.gross_usd,
      grossZig: a.grossZig + s.gross_zig,
      paye: a.paye + s.paye_usd,
      payeZig: a.payeZig + s.paye_zig,
      aids: a.aids + s.aids_usd,
      nssaEe: a.nssaEe + s.nssa_employee,
      nssaEr: a.nssaEr + s.nssa_employer,
      zimdef: a.zimdef + s.zimdef,
      netUsd: a.netUsd + s.net_usd,
      netZig: a.netZig + s.net_zig,
    }),
    { grossUsd: 0, grossZig: 0, paye: 0, payeZig: 0, aids: 0, nssaEe: 0, nssaEr: 0, zimdef: 0, netUsd: 0, netZig: 0 },
  );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/payroll" as Route}
        className="w-fit text-sm font-semibold text-primary hover:underline"
      >
        ← All pay runs
      </Link>

      {searchParams.exists && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          A pay period for {run.period_label} already exists — opened it here
          instead of creating a duplicate.
        </div>
      )}
      {searchParams.offcycle && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Off-cycle run created with each employee&apos;s special earning.
          Review below, then process.
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {run.period_label}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay date {fmtDate(run.pay_date)} · Rate US$1 = ZiG{" "}
            {run.exchange_rate.toFixed(2)}
            {run.is_off_cycle ? (
              <>
                {" · "}
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                  Off-cycle · {run.run_type[0] + run.run_type.slice(1).toLowerCase()}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            meta.cls,
          )}
        >
          {meta.label}
        </span>
      </header>

      <Card className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <FlowSteps status={run.status} />
        <PayRunActions id={run.name} status={run.status} />
      </Card>

      {isOpen ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground">
              Employees to be paid ({employees.length})
            </h2>
            <Link
              href={"/payroll/transactions" as Route}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all transactions →
            </Link>
          </div>
          <p className="-mt-3 text-sm text-muted-foreground">
            Click <strong>+ Capture</strong> on any row to add a variable
            earning or deduction for that employee. Then press{" "}
            <strong>Process payroll</strong> to calculate PAYE, AIDS Levy,
            NSSA and net pay for everyone.
          </p>
          <Card className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-5">Employee</TableHead>
                  <TableHead className="px-5">NEC industry</TableHead>
                  <TableHead className="px-5 text-right">Basic USD</TableHead>
                  <TableHead className="px-5 text-right">Basic ZiG</TableHead>
                  <TableHead className="px-5 text-right">Transactions</TableHead>
                  <TableHead className="px-5">Status</TableHead>
                  <TableHead className="px-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No active employees on this company yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((e) => (
                    <TableRow
                      key={e.employee}
                      className={cn(e.missing.length > 0 ? "bg-rose-50/40" : undefined)}
                    >
                      <TableCell className="px-5 align-middle">
                        <Link
                          href={`/employee/${encodeURIComponent(e.employee)}` as Route}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {e.employee_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {e.employee}
                          {e.job_title ? ` · ${e.job_title}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 align-middle text-muted-foreground">
                        {e.nec_industry || "—"}
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right">
                        {e.basic_usd ? num(e.basic_usd) : "—"}
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right">
                        {e.basic_zig ? num(e.basic_zig) : "—"}
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right">
                        {e.txnCount ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            {e.txnCount} captured
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 align-middle">
                        {e.missing.length ? (
                          <Link
                            href={`/employee/${encodeURIComponent(e.employee)}` as Route}
                            className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700"
                          >
                            ⚠ Excluded — missing {e.missing.length}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Ready
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right">
                        {e.missing.length ? (
                          <span className="text-xs text-muted-foreground">
                            Fix profile first
                          </span>
                        ) : (
                          <CaptureTransactionForm
                            periodId={run.name}
                            employees={[]}
                            codes={codeOptions}
                            fixedEmployee={{ id: e.employee, name: e.employee_name }}
                            triggerLabel="+ Capture"
                            triggerVariant="ghost"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : (
        <>
          {/* Cost summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            <Sum label="Gross" v={usd(tot.grossUsd)} s={zig(tot.grossZig)} />
            <Sum label="PAYE" v={usd(tot.paye)} s={zig(tot.payeZig)} />
            <Sum label="AIDS Levy" v={usd(tot.aids)} />
            <Sum label="NSSA (ee+er)" v={usd(tot.nssaEe + tot.nssaEr)} />
            <Sum label="ZIMDEF" v={usd(tot.zimdef)} />
            <Sum label="Net pay" v={usd(tot.netUsd)} s={zig(tot.netZig)} highlight />
          </div>

          {/* Debit summary — total cost to company */}
          <Card className="border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Debit summary
                </div>
                <p className="mt-1 text-sm text-foreground/80">
                  Net to employees {usd(tot.netUsd)} / {zig(tot.netZig)} · statutory remittances{" "}
                  {usd(tot.paye + tot.aids + tot.nssaEe + tot.nssaEr + tot.zimdef)} to ZIMRA, NSSA &amp; ZIMDEF
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total cost to company</div>
                <div className="text-2xl font-extrabold text-emerald-700">
                  {usd(tot.grossUsd + tot.nssaEr + tot.zimdef)}
                </div>
                <div className="text-sm font-bold text-emerald-700">
                  {zig(tot.grossZig)}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground">Payslip register</h2>
              {prev.label && (
                <p className="text-xs text-muted-foreground">
                  &ldquo;vs previous&rdquo; compares each employee&apos;s net pay to{" "}
                  {prev.label}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/api/payroll/documents/zimra?run=${encodeURIComponent(run.name)}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted/40"
                download
              >
                Download ZIMRA return (xlsx)
              </a>
              <Link
                href={"/payroll/reports" as Route}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Statutory returns →
              </Link>
            </div>
          </div>

          <Card className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-5">Employee</TableHead>
                  <TableHead className="px-5 text-right">Gross</TableHead>
                  <TableHead className="px-5 text-right">PAYE</TableHead>
                  <TableHead className="px-5 text-right">AIDS USD</TableHead>
                  <TableHead className="px-5 text-right">NSSA USD</TableHead>
                  <TableHead className="px-5 text-right">Net USD</TableHead>
                  <TableHead className="px-5 text-right">Net ZiG</TableHead>
                  <TableHead className="px-5 text-right">vs previous</TableHead>
                  <TableHead className="px-5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      No payslips on this run yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  slips.map((s) => (
                    <TableRow key={s.name}>
                      <TableCell className="px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                            {initials(s.employee_name)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{s.employee_name}</div>
                            <div className="text-xs text-muted-foreground">{s.employee}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right">
                        {usd(s.gross_usd)}
                        <div className="text-xs text-muted-foreground">{zig(s.gross_zig)}</div>
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right">
                        {usd(s.paye_usd)}
                        <div className="text-xs text-muted-foreground">{zig(s.paye_zig)}</div>
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right text-muted-foreground">
                        {num(s.aids_usd)}
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right text-muted-foreground">
                        {num(s.nssa_employee)}
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right font-bold">
                        {num(s.net_usd)}
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right font-bold">
                        {num(s.net_zig)}
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right">
                        <DeltaTag
                          current={s.net_usd}
                          previous={prev.byEmployee.get(s.employee)}
                          fmt={usd}
                          withPercent
                        />
                      </TableCell>
                      <TableCell className="px-5 align-middle text-right">
                        <Link
                          href={`/payroll/${encodeURIComponent(run.name)}/payslip/${encodeURIComponent(s.employee)}` as Route}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Payslip →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {slips.length > 0 && (
                <TableFooter>
                  <TableRow className="border-t-2 bg-muted/30 font-bold">
                    <TableCell className="px-5">Totals</TableCell>
                    <TableCell className="px-5 text-right">{usd(tot.grossUsd)}</TableCell>
                    <TableCell className="px-5 text-right">{usd(tot.paye)}</TableCell>
                    <TableCell className="px-5 text-right">{num(tot.aids)}</TableCell>
                    <TableCell className="px-5 text-right">{num(tot.nssaEe)}</TableCell>
                    <TableCell className="px-5 text-right text-emerald-700">{num(tot.netUsd)}</TableCell>
                    <TableCell className="px-5 text-right text-emerald-700">{num(tot.netZig)}</TableCell>
                    <TableCell className="px-5 text-right">
                      {prev.label ? (
                        <DeltaTag current={tot.netUsd} previous={prev.total} fmt={usd} withPercent />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="px-5" />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function Sum({
  label,
  v,
  s,
  highlight,
}: {
  label: string;
  v: string;
  s?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn("p-4", highlight ? "border-emerald-200 bg-emerald-50" : undefined)}
    >
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-base font-extrabold tracking-tight",
          highlight ? "text-emerald-700" : "text-foreground",
        )}
      >
        {v}
      </div>
      {s && <div className="text-xs text-muted-foreground">{s}</div>}
    </Card>
  );
}
