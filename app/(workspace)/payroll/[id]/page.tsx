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
  const isTerminal = run.is_off_cycle && run.run_type === "TERMINAL";

  // TERMINAL runs are single-employee retrenchment payouts. Skip the
  // regular whole-roster employees table + wizard entirely and render
  // the specialized §14 view with Process button.
  if (isOpen && isTerminal) {
    const { TerminalRunDetail } = await import("@/components/payroll/terminal-run-detail");
    return <TerminalRunDetail run={run} />;
  }

  // OPEN view needs the active-employees table + codes (for per-row
  // Capture) — and the previous-run net map so HR can see what each
  // employee last got paid before deciding whether to adjust this run.
  // PROCESSED view needs the payslips + the same previous map for the
  // "vs previous" DeltaTag on the register. OPEN view only needs the
  // employee roster for the "ready to run" card counts — everything
  // per-employee is now inside the wizard.
  const [employees, slips, prev] = await Promise.all([
    isOpen ? listEmployeesForRun(id) : Promise.resolve([]),
    isOpen ? Promise.resolve([]) : listPayslipsForRun(id),
    listPreviousRunNetMap(id),
  ]);

  // Tax-method lookup for the FDS / NON_FDS pill. One bulk fetch keyed
  // on whichever employee list this view is showing (OPEN → active
  // roster, PROCESSED → paid employees) so the pill appears on both.
  const taxMethodByEmp = new Map<string, "FDS" | "NON_FDS">();
  const empIdsForTaxLookup = isOpen
    ? employees.map((e) => e.employee)
    : slips.map((s) => s.employee);
  if (empIdsForTaxLookup.length > 0) {
    const { frappeCall } = await import("@/lib/frappe/client");
    try {
      const empRows = await frappeCall<Array<{ name: string; tax_method: string | null }>>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Employee",
          fields: ["name", "tax_method"],
          filters: JSON.stringify([["name", "in", empIdsForTaxLookup]]),
          limit_page_length: 5000,
        },
        as: "user",
      });
      for (const r of empRows ?? []) {
        taxMethodByEmp.set(r.name, (r.tax_method === "NON_FDS" ? "NON_FDS" : "FDS"));
      }
    } catch {
      /* non-fatal — column just won't show a pill */
    }
  }
  // Roster counts for the compact "ready to run" card on OPEN runs.
  const rosterCounts = employees.reduce(
    (a, e) => {
      if (e.missing.length > 0) return { ...a, blocked: a.blocked + 1 };
      if (e.payroll_class === "HOURLY") return { ...a, hourly: a.hourly + 1 };
      if (e.payroll_class === "CONTRACTOR") return { ...a, contractor: a.contractor + 1 };
      return { ...a, salaried: a.salaried + 1 };
    },
    { salaried: 0, hourly: 0, contractor: 0, blocked: 0 },
  );

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
          {/* Rippling-shape "ready to run" card. The old inline
              employees table lived here — HR ended up doing all
              their real editing inside the wizard anyway, so the
              detail page's job is now: show what's about to run,
              and hand off. Click Run payroll → and the wizard opens
              on the Salaried step where the actual per-employee
              work happens. */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Roster ready to run
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rosterCounts.salaried} salaried
                  {rosterCounts.hourly ? ` · ${rosterCounts.hourly} hourly` : ""}
                  {rosterCounts.contractor ? ` · ${rosterCounts.contractor} 1099` : ""}
                  {rosterCounts.blocked ? (
                    <>
                      {" · "}
                      <span className="font-semibold text-rose-700">
                        {rosterCounts.blocked} blocked
                      </span>
                    </>
                  ) : null}
                </p>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                  Click <strong>Run payroll →</strong> to open the wizard.
                  You&apos;ll step through Salaried, Hourly, and Contractor
                  employees; capture earnings and deductions inline; then
                  preview and process ZIMRA PAYE, AIDS Levy, NSSA and
                  ZIMDEF for the whole roster.
                </p>
              </div>
              <Link
                href={`/payroll/${encodeURIComponent(run.name)}/run` as Route}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Run payroll →
              </Link>
            </div>
            {rosterCounts.blocked ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {rosterCounts.blocked} employee
                {rosterCounts.blocked === 1 ? " is" : "s are"} missing critical
                info and will be excluded from this run until fixed. Open the
                wizard to see who and jump straight to their profile.
              </div>
            ) : null}
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
                  <TableHead className="px-5 sticky left-0 z-20 bg-card border-r shadow-[1px_0_0_0_rgb(0_0_0/0.04)]">
                    Employee
                  </TableHead>
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
                      <TableCell className="px-5 align-middle sticky left-0 z-10 bg-card border-r shadow-[1px_0_0_0_rgb(0_0_0/0.04)]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                            {initials(s.employee_name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{s.employee_name}</span>
                              {taxMethodByEmp.has(s.employee) && (
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                    taxMethodByEmp.get(s.employee) === "FDS"
                                      ? "bg-primary/10 text-primary"
                                      : "bg-amber-100 text-amber-700",
                                  )}
                                  title={
                                    taxMethodByEmp.get(s.employee) === "FDS"
                                      ? "Final Deduction System — cumulative + tax credits"
                                      : "Independent monthly calc — no YTD, no credits"
                                  }
                                >
                                  {taxMethodByEmp.get(s.employee)}
                                </span>
                              )}
                            </div>
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
                    <TableCell className="px-5 sticky left-0 z-10 bg-muted border-r shadow-[1px_0_0_0_rgb(0_0_0/0.04)]">
                      Totals
                    </TableCell>
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
