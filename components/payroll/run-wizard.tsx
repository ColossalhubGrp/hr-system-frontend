"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/sonner";
import { DeltaTag } from "@/components/payroll/delta-tag";
import type { EmployeeForRun, PayrollClass, WizardEntry } from "@/lib/payroll-engine/payruns";
import {
  processPeriod,
  updateEmployeeSalary,
  upsertTxnByCode,
  upsertWizardEntry,
  type WizardEntryPatch,
} from "@/app/(workspace)/payroll/payruns-actions";

type PrevSnapshot = {
  gross_usd: number;
  paye_usd: number;
  nssa_ee_usd: number;
  net_usd: number;
};

const CLASS_LABEL: Record<PayrollClass, { plural: string; singular: string }> = {
  SALARIED: { plural: "Salaried employees", singular: "salaried employee" },
  HOURLY: { plural: "Hourly employees", singular: "hourly employee" },
  CONTRACTOR: { plural: "Contractors", singular: "contractor" },
};

/**
 * Compute the projected gross for this row based on its class + wizard
 * entry. Salaried = basic + adjustment + captured earnings; hourly =
 * rate × hours + rate × 1.5 × OT (basic doesn't apply); contractor =
 * flat 1099 (no basic, no earnings — statutory bypassed at process).
 */
function grossUsd(e: EmployeeForRun): number {
  const w = e.wiz;
  const otMult = w.overtime_multiplier || 1.5;
  const weMult = w.weekend_multiplier || 2.0;
  const holMult = w.holiday_multiplier || 2.0;

  if (e.payroll_class === "HOURLY") {
    // Approved timesheet wins over manual wizard cells.
    const hours = e.timesheet ? e.timesheet.regular_hours : w.hours_worked;
    const ot = e.timesheet ? e.timesheet.overtime_hours : w.overtime_hours;
    const we = e.timesheet ? e.timesheet.weekend_hours : 0;
    const hol = e.timesheet ? e.timesheet.holiday_hours : 0;
    return (
      w.hourly_rate_usd * hours +
      w.hourly_rate_usd * otMult * ot +
      w.hourly_rate_usd * weMult * we +
      w.hourly_rate_usd * holMult * hol
    );
  }
  if (e.payroll_class === "CONTRACTOR") {
    return w.contractor_flat_usd;
  }
  // Salaried: basic + adjustment + captured earnings + timesheet-driven
  // OT / weekend / holiday earnings (each = basic/expected_hours ×
  // its own multiplier × hours in that category).
  let salariedExtras = 0;
  if (e.timesheet && e.basic_usd > 0) {
    const expected = e.timesheet.expected_hours || 176;
    const hourly = e.basic_usd / expected;
    salariedExtras =
      hourly * otMult * e.timesheet.overtime_hours +
      hourly * weMult * e.timesheet.weekend_hours +
      hourly * holMult * e.timesheet.holiday_hours;
  }
  return e.basic_usd + w.salary_adjustment_usd + e.captured_earn_usd + salariedExtras;
}

const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const zig = (n: number) =>
  `ZiG ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export function RunWizard({
  runId,
  runLabel,
  payDate,
  exchangeRate,
  employees,
  prevLabel,
  prevSnapshots,
  prevTotalNet,
  catalogEarningCodes,
}: {
  runId: string;
  runLabel: string;
  payDate: string;
  exchangeRate: number;
  employees: EmployeeForRun[];
  prevLabel: string | null;
  prevSnapshots: Record<string, PrevSnapshot>;
  prevTotalNet: number;
  /** Every USD-earning Payroll Transaction Code in the tenant's
   *  catalog. Wizard's Salaried grid renders one column per code
   *  even if no txn exists yet, so HR sees Housing / Transport /
   *  Bonus / etc. as first-class columns. */
  catalogEarningCodes: string[];
}) {
  const router = useRouter();

  // Local state — mirrors the server rows and lets inline edits stay
  // responsive without a round-trip per keystroke.
  const [rows, setRows] = useState<EmployeeForRun[]>(employees);
  const [approving, startApprove] = useTransition();

  // Classification buckets.
  const salaried = rows.filter((r) => r.payroll_class === "SALARIED");
  const hourly = rows.filter((r) => r.payroll_class === "HOURLY");
  const contractors = rows.filter((r) => r.payroll_class === "CONTRACTOR");
  const blocked = rows.filter((r) => r.missing.length > 0);

  const steps = useMemo(() => {
    const s: Array<{ id: string; title: string; count: number }> = [];
    if (blocked.length > 0) {
      s.push({ id: "missing", title: "Employees missing details", count: blocked.length });
    }
    s.push({ id: "salaried", title: CLASS_LABEL.SALARIED.plural, count: salaried.length });
    s.push({ id: "hourly", title: CLASS_LABEL.HOURLY.plural, count: hourly.length });
    s.push({ id: "contractors", title: CLASS_LABEL.CONTRACTOR.plural, count: contractors.length });
    s.push({ id: "preview", title: "Preview your payroll summary", count: rows.length });
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked.length, salaried.length, hourly.length, contractors.length, rows.length]);

  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx]?.id ?? "preview";

  const patchRow = (emp: string, patch: Partial<EmployeeForRun>) =>
    setRows((rs) => rs.map((r) => (r.employee === emp ? { ...r, ...patch } : r)));

  async function approve() {
    startApprove(async () => {
      try {
        await processPeriod(runId);
        toast.success("Pay run processed.");
        router.push(`/payroll/${encodeURIComponent(runId)}` as Route);
      } catch (err) {
        const msg = (err as { message?: string })?.message ?? "Approve failed.";
        toast.error(msg);
      }
    });
  }

  return (
    <div className="flex min-h-full flex-col gap-0">
      {/* Wizard top bar */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">☰</span>
          <span className="font-bold text-foreground">
            {steps[stepIdx]?.title}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/payroll/${encodeURIComponent(runId)}/timesheets` as Route}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Timesheets →
          </Link>
          <Link
            href={`/payroll/${encodeURIComponent(runId)}` as Route}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            ⤓ Save and exit
          </Link>
        </div>
      </div>

      {/* Step chips */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-6 py-2 text-xs">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStepIdx(i)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition",
              i === stepIdx
                ? "bg-primary text-primary-foreground"
                : i < stepIdx
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="tabular-nums">{i + 1}</span>
            <span>{s.title}</span>
            {s.id !== "preview" && s.id !== "missing" ? (
              <span className="rounded-full bg-black/10 px-1.5 text-[10px]">{s.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Run meta header (hidden on missing + preview) */}
        {step !== "missing" && step !== "preview" && (
          <Card className="mb-6 p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Meta label="Pay run" value={runLabel} />
              <Meta label="Pay date" value={fmtDate(payDate)} />
              <Meta
                label="Exchange rate"
                value={`US$1 = ZiG ${exchangeRate.toFixed(2)}`}
              />
            </div>
          </Card>
        )}

        {step === "missing" && <MissingStep blocked={blocked} runId={runId} />}

        {step === "salaried" && (
          <ClassStep
            cls="SALARIED"
            runId={runId}
            rows={salaried}
            prevSnapshots={prevSnapshots}
            prevLabel={prevLabel}
            onPatch={patchRow}
            catalogEarningCodes={catalogEarningCodes}
          />
        )}

        {step === "hourly" && (
          <ClassStep
            cls="HOURLY"
            runId={runId}
            rows={hourly}
            prevSnapshots={prevSnapshots}
            prevLabel={prevLabel}
            onPatch={patchRow}
            catalogEarningCodes={catalogEarningCodes}
          />
        )}

        {step === "contractors" && (
          <ClassStep
            cls="CONTRACTOR"
            runId={runId}
            rows={contractors}
            prevSnapshots={prevSnapshots}
            prevLabel={prevLabel}
            onPatch={patchRow}
            catalogEarningCodes={catalogEarningCodes}
          />
        )}

        {step === "preview" && (
          <PreviewStep
            rows={rows}
            blocked={blocked}
            payDate={payDate}
            prevSnapshots={prevSnapshots}
            prevLabel={prevLabel}
            prevTotalNet={prevTotalNet}
          />
        )}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 flex items-center justify-between border-t bg-background px-6 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40"
          disabled={stepIdx === 0}
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
        >
          ‹ Back
        </button>

        {step === "preview" ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            disabled={approving}
            onClick={approve}
          >
            {approving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Approving…
              </>
            ) : (
              <>Approve &amp; process payroll</>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
          >
            Next: {steps[stepIdx + 1]?.title ?? "Preview"} ›
          </button>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-semibold text-foreground">{value}</div>
    </div>
  );
}

// ── Step: Missing details ────────────────────────────────────────

function MissingStep({ blocked, runId }: { blocked: EmployeeForRun[]; runId: string }) {
  return (
    <Card className="p-6">
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        These employees will <strong>not be included</strong> in this pay run
        until their missing information is provided. Fix each profile — you can
        come back to the wizard here after saving.
      </p>
      <div className="mb-2 text-sm font-semibold text-foreground">
        Showing {blocked.length} of {blocked.length}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-3">Employee</TableHead>
            <TableHead className="px-3">Missing</TableHead>
            <TableHead className="px-3 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blocked.map((r) => (
            <TableRow key={r.employee}>
              <TableCell className="px-3">
                <div className="font-semibold">{r.employee_name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.employee}
                  {r.job_title ? ` · ${r.job_title}` : ""}
                </div>
              </TableCell>
              <TableCell className="px-3">
                <span className="text-rose-600">
                  ● Missing {r.missing.length} critical detail{r.missing.length === 1 ? "" : "s"}
                </span>
                <div className="text-xs text-muted-foreground">{r.missing.join(", ")}</div>
              </TableCell>
              <TableCell className="px-3 text-right">
                <Link
                  href={
                    `/employee/${encodeURIComponent(r.employee)}/edit?from=payroll-wizard&run=${encodeURIComponent(runId)}&fix=${r.missing_fieldnames.join(",")}` as Route
                  }
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Fix profile →
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ── Step: per-class editable table ───────────────────────────────

function ClassStep({
  cls,
  runId,
  rows,
  prevSnapshots,
  prevLabel,
  onPatch,
  catalogEarningCodes,
}: {
  cls: PayrollClass;
  runId: string;
  rows: EmployeeForRun[];
  prevSnapshots: Record<string, PrevSnapshot>;
  prevLabel: string | null;
  onPatch: (emp: string, patch: Partial<EmployeeForRun>) => void;
  catalogEarningCodes: string[];
}) {
  const [filter, setFilter] = useState("");

  const visible = filter
    ? rows.filter((r) =>
        r.employee_name.toLowerCase().includes(filter.toLowerCase()) ||
        r.employee.toLowerCase().includes(filter.toLowerCase()),
      )
    : rows;

  /** Employees actually counted in the run — HR unchecked (or the
   *  row is blocked by missing critical info). Totals + Gross
   *  summary use this subset so ticking / unticking an employee
   *  updates footer amounts immediately. */
  const includedRows = visible.filter(
    (r) => r.missing.length === 0 && r.wiz.include_in_run !== false,
  );

  const totalGross = includedRows.reduce((a, e) => a + grossUsd(e), 0);
  const totalPrevGross = includedRows.reduce(
    (a, e) => a + (prevSnapshots[e.employee]?.gross_usd ?? 0),
    0,
  );

  // Dynamic per-code columns. Union of every USD-earning code in
  // the tenant's catalog (from server) + any captured on the run.
  // Wizard-dedicated codes filtered so they don't double-render.
  const DEDICATED_CODES = new Set([
    "SALARY_ADJUSTMENT",
    "HOURLY_PAY",
    "CONTRACTOR_PAY",
  ]);
  const dynamicCodes = useMemo(() => {
    const s = new Set<string>();
    for (const code of catalogEarningCodes) {
      if (!DEDICATED_CODES.has(code)) s.add(code);
    }
    for (const e of rows) {
      for (const t of e.captured_txns) {
        if (t.kind === "EARNING"
            && t.currency === "USD"
            && !DEDICATED_CODES.has(t.code)) {
          s.add(t.code);
        }
      }
    }
    return Array.from(s).sort();
  }, [rows]);
  // Lookup {employee → {code → amount}} for O(1) cell reads.
  const codeAmounts = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const e of rows) {
      const sub = new Map<string, number>();
      for (const t of e.captured_txns) {
        if (t.kind === "EARNING"
            && t.currency === "USD"
            && !DEDICATED_CODES.has(t.code)) {
          sub.set(t.code, (sub.get(t.code) ?? 0) + t.amount);
        }
      }
      m.set(e.employee, sub);
    }
    return m;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
          {cls === "SALARIED" ? "👔" : cls === "HOURLY" ? "⏱" : "📄"}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          No {CLASS_LABEL[cls].plural.toLowerCase()} on this run
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Assign the <strong>Payroll class</strong> field on an employee&apos;s
          profile to <strong>{cls}</strong> and they&apos;ll show up here on the
          next pay run.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            placeholder="Employee name"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-56 rounded-lg border px-3 py-1.5 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            Showing {visible.length} of {rows.length}
          </span>
        </div>
        {cls === "SALARIED" && (
          <Link
            href={"/payroll/setup/codes" as Route}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/40"
            title="Add new earning / deduction codes in Setup — they appear here as columns automatically."
          >
            Manage earning codes →
          </Link>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 px-3 sticky left-0 z-20 bg-card" />
            <TableHead className="px-4 sticky left-8 z-20 bg-card border-r shadow-[1px_0_0_0_rgb(0_0_0/0.04)]">
              Employee
            </TableHead>
            {cls === "SALARIED" && (
              <>
                <TableHead
                  className="px-3 text-right w-32 whitespace-nowrap"
                  title="Monthly basic salary in USD. Editing writes to Employee.basic_usd — persists across runs."
                >
                  <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground block">
                    USD
                  </span>
                  Salary
                </TableHead>
                <TableHead
                  className="px-3 text-right w-32 whitespace-nowrap"
                  title="Monthly basic salary in ZiG. Editing writes to Employee.basic_zig — persists across runs."
                >
                  <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground block">
                    ZiG
                  </span>
                  Salary
                </TableHead>
                {dynamicCodes.map((c) => (
                  <TableHead
                    key={`hdr-${c}`}
                    className="px-3 text-right w-32 whitespace-nowrap"
                    title={`Payroll Transaction Code · ${c}`}
                  >
                    <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground block">
                      USD
                    </span>
                    {c}
                  </TableHead>
                ))}
              </>
            )}
            {cls === "HOURLY" && (
              <>
                <TableHead className="px-4 text-right w-32">Rate (USD/hr)</TableHead>
                <TableHead className="px-4 text-right w-24">Hours</TableHead>
                <TableHead className="px-4 text-right w-24">OT hrs</TableHead>
                <TableHead
                  className="px-4 text-right w-24"
                  title="Overtime multiplier — Zim weekday default 1.5×, weekends / public holidays commonly 2×. Editable per row."
                >
                  OT ×
                </TableHead>
              </>
            )}
            {cls === "CONTRACTOR" && (
              <TableHead className="px-4 text-right w-40">1099 payment (USD)</TableHead>
            )}
            <TableHead className="px-4 text-right">Gross</TableHead>
            <TableHead className="px-4 text-right">
              Previous
              {prevLabel && (
                <div className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                  {prevLabel}
                </div>
              )}
            </TableHead>
            <TableHead className="px-4 text-right">Δ vs prev</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((r) => {
            const prev = prevSnapshots[r.employee];
            const projGross = grossUsd(r);
            const isMissing = r.missing.length > 0;
            const patchWiz = (patch: WizardEntryPatch, wizPatch: Partial<WizardEntry>) => {
              onPatch(r.employee, {
                wiz: { ...r.wiz, ...wizPatch },
              });
              // Fire the server upsert; failure toast is inside NumCell.
              void upsertWizardEntry(runId, r.employee, patch);
            };
            const included = r.wiz.include_in_run !== false;
            const tsFlags = r.timesheet?.flag_codes ?? [];
            // Amber-triangle-worthy flags — surface on hourly rows.
            const hourlyWarnFlags = tsFlags.filter((c) =>
              c === "SHIFT_TOO_LONG"
              || c === "MISSING_OUT_PUNCH"
              || c === "HEAVY_OVERTIME"
            );
            return (
              <TableRow
                key={r.employee}
                className={cn(
                  isMissing ? "bg-rose-50/40" : undefined,
                  !included ? "opacity-60" : undefined,
                )}
              >
                {/* Include-in-run tick — HR unchecks to skip an
                    employee on this run (Rippling parity). Missing
                    employees can't be included at all. Sticky-left
                    so the tick stays visible during horizontal
                    scroll through the earning-code columns. */}
                <TableCell
                  className={cn(
                    "px-3 align-middle sticky left-0 z-10",
                    isMissing ? "bg-rose-50" : "bg-card",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={included && !isMissing}
                    disabled={isMissing}
                    aria-label={`Include ${r.employee_name} in this run`}
                    onChange={(e) => {
                      const nextIncluded = e.target.checked;
                      patchWiz(
                        { include_in_run: nextIncluded ? 1 : 0 },
                        { include_in_run: nextIncluded },
                      );
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </TableCell>
                <TableCell
                  className={cn(
                    "px-4 align-middle sticky left-8 z-10 border-r shadow-[1px_0_0_0_rgb(0_0_0/0.04)]",
                    isMissing ? "bg-rose-50" : "bg-card",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {initials(r.employee_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">
                          {r.employee_name}
                        </span>
                        {isMissing ? (
                          /* Red triangle — clicking deep-links straight
                              to the employee edit page with fix params
                              (matches Rippling's Sam Sampson pattern). */
                          <Link
                            href={
                              `/employee/${encodeURIComponent(r.employee)}/edit?from=payroll-wizard&run=${encodeURIComponent(runId)}&fix=${r.missing_fieldnames.join(",")}` as Route
                            }
                            title={`Missing critical info: ${r.missing.join(", ")}. Click to fix.`}
                            className="inline-flex items-center gap-0.5 rounded text-rose-600 hover:bg-rose-50"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                        {cls === "HOURLY" && hourlyWarnFlags.length > 0 ? (
                          /* Amber triangle — timesheet flagged a long
                              shift, missing clockout, or heavy overtime.
                              Click → the run's Timesheets page to
                              review + correct. */
                          <Link
                            href={
                              `/payroll/${encodeURIComponent(runId)}/timesheets` as Route
                            }
                            title={`Timesheet flags: ${hourlyWarnFlags.map((c) => c.replace(/_/g, " ")).join(", ")}. Click to review.`}
                            className="inline-flex items-center gap-0.5 rounded text-amber-700 hover:bg-amber-50"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.employee}
                        {r.job_title ? ` · ${r.job_title}` : ""}
                      </div>
                      {isMissing && (
                        <div className="mt-0.5 text-[10px] font-semibold uppercase text-rose-600">
                          Missing {r.missing.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {cls === "SALARIED" && (
                  <>
                    <TableCell className="px-3 align-middle text-right">
                      <NumCell
                        value={r.basic_usd}
                        disabled={isMissing}
                        step="1"
                        onCommit={async (v) => {
                          onPatch(r.employee, { basic_usd: v });
                          await updateEmployeeSalary(r.employee, { basic_usd: v });
                        }}
                      />
                    </TableCell>
                    <TableCell className="px-3 align-middle text-right">
                      <NumCell
                        value={r.basic_zig}
                        disabled={isMissing}
                        step="1"
                        onCommit={async (v) => {
                          onPatch(r.employee, { basic_zig: v });
                          await updateEmployeeSalary(r.employee, { basic_zig: v });
                        }}
                      />
                      {r.timesheet && r.basic_usd > 0 && (
                        r.timesheet.overtime_hours > 0
                        || r.timesheet.weekend_hours > 0
                        || r.timesheet.holiday_hours > 0
                      ) ? (
                        <div className="mt-0.5 text-[10px] font-semibold text-amber-700">
                          {r.timesheet.overtime_hours > 0
                            ? `+${r.timesheet.overtime_hours.toFixed(1)} OT `
                            : ""}
                          {r.timesheet.weekend_hours > 0
                            ? `+${r.timesheet.weekend_hours.toFixed(1)} wknd `
                            : ""}
                          {r.timesheet.holiday_hours > 0
                            ? `+${r.timesheet.holiday_hours.toFixed(1)} hol `
                            : ""}
                          hrs → auto-earnings on process
                        </div>
                      ) : null}
                    </TableCell>
                    {dynamicCodes.map((code) => {
                      const currentAmt = codeAmounts.get(r.employee)?.get(code) ?? 0;
                      return (
                        <TableCell
                          key={`cell-${r.employee}-${code}`}
                          className="px-3 align-middle text-right"
                        >
                          <NumCell
                            value={currentAmt}
                            disabled={isMissing}
                            onCommit={async (v) => {
                              // Optimistically patch the local
                              // captured_txns so projected gross
                              // + totals recompute immediately;
                              // then persist via the per-cell
                              // upsert endpoint.
                              const nextTxns = r.captured_txns.filter(
                                (t) => !(t.kind === "EARNING"
                                       && t.currency === "USD"
                                       && t.code === code),
                              );
                              if (v > 0) {
                                nextTxns.push({
                                  code,
                                  kind: "EARNING",
                                  currency: "USD",
                                  amount: v,
                                });
                              }
                              const oldEarnUsd = r.captured_earn_usd;
                              const newEarnUsd =
                                oldEarnUsd - currentAmt + v;
                              onPatch(r.employee, {
                                captured_txns: nextTxns,
                                captured_earn_usd: newEarnUsd,
                              });
                              await upsertTxnByCode(runId, r.employee, code, v);
                            }}
                          />
                        </TableCell>
                      );
                    })}
                  </>
                )}

                {cls === "HOURLY" && (
                  <>
                    <TableCell className="px-4 align-middle text-right">
                      <NumCell
                        value={r.wiz.hourly_rate_usd}
                        disabled={isMissing}
                        step="0.01"
                        onCommit={(v) =>
                          patchWiz({ hourly_rate_usd: v }, { hourly_rate_usd: v })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle text-right">
                      {r.timesheet ? (
                        <ReadOnlyHours
                          value={r.timesheet.regular_hours}
                          source={r.timesheet.source}
                        />
                      ) : (
                        <NumCell
                          value={r.wiz.hours_worked}
                          disabled={isMissing}
                          step="0.25"
                          onCommit={(v) =>
                            patchWiz({ hours_worked: v }, { hours_worked: v })
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="px-4 align-middle text-right">
                      {r.timesheet ? (
                        <>
                          <ReadOnlyHours
                            value={r.timesheet.overtime_hours}
                            source={r.timesheet.source}
                          />
                          {(r.timesheet.weekend_hours > 0
                            || r.timesheet.holiday_hours > 0) ? (
                            <div className="mt-0.5 text-[9px] font-semibold text-amber-700">
                              {r.timesheet.weekend_hours > 0
                                ? `wknd ${r.timesheet.weekend_hours.toFixed(1)}h `
                                : ""}
                              {r.timesheet.holiday_hours > 0
                                ? `hol ${r.timesheet.holiday_hours.toFixed(1)}h`
                                : ""}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <NumCell
                          value={r.wiz.overtime_hours}
                          disabled={isMissing}
                          step="0.25"
                          onCommit={(v) =>
                            patchWiz({ overtime_hours: v }, { overtime_hours: v })
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="px-4 align-middle text-right">
                      <NumCell
                        value={r.wiz.overtime_multiplier || 1.5}
                        disabled={isMissing}
                        step="0.1"
                        onCommit={(v) =>
                          patchWiz(
                            { overtime_multiplier: v },
                            { overtime_multiplier: v },
                          )
                        }
                      />
                    </TableCell>
                  </>
                )}

                {cls === "CONTRACTOR" && (
                  <TableCell className="px-4 align-middle text-right">
                    <NumCell
                      value={r.wiz.contractor_flat_usd}
                      disabled={isMissing}
                      onCommit={(v) =>
                        patchWiz({ contractor_flat_usd: v }, { contractor_flat_usd: v })
                      }
                    />
                    {!r.has_tax_clearance && r.wiz.contractor_flat_usd > 0 ? (
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] font-semibold text-rose-600">
                        <span title="No ITF263 on file — engine withholds 10% WHT per ZIMRA §80.">
                          ⚠ 10% WHT ≈ {usd(r.wiz.contractor_flat_usd * 0.1)}
                        </span>
                      </div>
                    ) : null}
                  </TableCell>
                )}

                <TableCell className="px-4 align-middle text-right">
                  <span className="font-semibold text-foreground">{usd(projGross)}</span>
                  {r.captured_deduct_usd ? (
                    <div className="text-[10px] text-rose-600">
                      less {usd(r.captured_deduct_usd)}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="px-4 align-middle text-right text-muted-foreground">
                  {prev ? (
                    <>
                      <div>{usd(prev.gross_usd)}</div>
                      <div className="text-[10px]">gross · {usd(prev.net_usd)} net</div>
                    </>
                  ) : (
                    <span className="text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4 align-middle text-right">
                  {prev?.gross_usd ? (
                    <DeltaTag
                      current={projGross}
                      previous={prev.gross_usd}
                      fmt={usd}
                      withPercent
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t-2 bg-muted/30 font-bold">
            {/* Filler for the include-checkbox column */}
            <TableCell className="px-3 sticky left-0 z-10 bg-muted" />
            <TableCell className="px-4 sticky left-8 z-10 bg-muted border-r shadow-[1px_0_0_0_rgb(0_0_0/0.04)]">
              Totals
            </TableCell>
            {cls === "SALARIED" && (
              <>
                <TableCell className="px-3 text-right">
                  {usd(includedRows.reduce((a, e) => a + e.basic_usd, 0))}
                </TableCell>
                <TableCell className="px-3 text-right">
                  {(() => {
                    const t = includedRows.reduce((a, e) => a + e.basic_zig, 0);
                    return t ? zig(t) : "—";
                  })()}
                </TableCell>
                {dynamicCodes.map((code) => {
                  const t = includedRows.reduce(
                    (a, e) => a + (codeAmounts.get(e.employee)?.get(code) ?? 0),
                    0,
                  );
                  return (
                    <TableCell
                      key={`ft-${code}`}
                      className="px-3 text-right"
                    >
                      {t ? usd(t) : "—"}
                    </TableCell>
                  );
                })}
              </>
            )}
            {cls === "HOURLY" && (
              <>
                <TableCell className="px-4 text-right text-muted-foreground text-xs">
                  —
                </TableCell>
                <TableCell className="px-4 text-right">
                  {includedRows.reduce((a, e) => a + e.wiz.hours_worked, 0).toFixed(2)}
                </TableCell>
                <TableCell className="px-4 text-right">
                  {includedRows.reduce((a, e) => a + e.wiz.overtime_hours, 0).toFixed(2)}
                </TableCell>
                <TableCell className="px-4 text-right text-muted-foreground text-xs">
                  {/* Multipliers don't sum meaningfully — leave blank */}
                  —
                </TableCell>
              </>
            )}
            {cls === "CONTRACTOR" && (
              <TableCell className="px-4 text-right">
                {(() => {
                  const t = includedRows.reduce((a, e) => a + e.wiz.contractor_flat_usd, 0);
                  return t ? usd(t) : "—";
                })()}
              </TableCell>
            )}
            <TableCell className="px-4 text-right text-emerald-700">
              {usd(totalGross)}
            </TableCell>
            <TableCell className="px-4 text-right">
              {totalPrevGross ? usd(totalPrevGross) : "—"}
            </TableCell>
            <TableCell className="px-4 text-right">
              {totalPrevGross ? (
                <DeltaTag
                  current={totalGross}
                  previous={totalPrevGross}
                  fmt={usd}
                  withPercent
                />
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Card>
  );
}

// ── Timesheet-driven read-only hours cell ────────────────────────

/**
 * When an approved Payroll Timesheet exists, the hourly cells lock
 * — the timesheet is source-of-truth. A small chip labels where the
 * value came from. HR can Correct via the Timesheets page (which
 * flips the row to MANUAL and unlocks re-entry).
 */
function ReadOnlyHours({
  value, source,
}: {
  value: number;
  source: string;
}) {
  return (
    <div className="inline-flex flex-col items-end">
      <span className="font-semibold text-foreground">{value.toFixed(2)}</span>
      <span
        className={cn(
          "mt-0.5 rounded px-1 text-[9px] font-bold uppercase tracking-wide",
          source === "ATTENDANCE"
            ? "bg-emerald-100 text-emerald-700"
            : source === "UPLOAD"
            ? "bg-purple-100 text-purple-700"
            : "bg-slate-100 text-slate-700",
        )}
        title="Value from approved timesheet — edit on the Timesheets page"
      >
        {source === "ATTENDANCE" ? "attendance" : source === "UPLOAD" ? "csv" : "timesheet"}
      </span>
    </div>
  );
}

// ── Editable number cell (single generic input) ──────────────────

/**
 * Local-only number input that commits on blur / Enter. It doesn't
 * touch the server itself — the parent's `onCommit` is called with
 * the parsed value and is expected to (1) patch local row state so
 * projected gross re-renders and (2) fire the server upsert. The
 * cell shows a spinner while the parent's promise (if returned) is
 * outstanding.
 */
function NumCell({
  value,
  disabled,
  step = "0.01",
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  step?: string;
  onCommit: (v: number) => void | Promise<void>;
}) {
  const [local, setLocal] = useState<string>(value ? String(value) : "");
  const [pending, setPending] = useState(false);
  const lastCommittedRef = useRef<number>(value);

  useEffect(() => {
    setLocal(value ? String(value) : "");
    lastCommittedRef.current = value;
  }, [value]);

  async function commit() {
    const parsed = parseFloat(local || "0") || 0;
    if (parsed === lastCommittedRef.current) return;
    const old = lastCommittedRef.current;
    setPending(true);
    try {
      await onCommit(parsed);
      lastCommittedRef.current = parsed;
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Save failed.";
      toast.error(msg);
      setLocal(old ? String(old) : "");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        step={step}
        disabled={disabled || pending}
        value={local}
        placeholder="0"
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-24 rounded-md border px-2 py-1 text-right text-sm disabled:bg-muted disabled:text-muted-foreground"
      />
      {pending ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}

// ── Step: Preview ────────────────────────────────────────────────

function PreviewStep({
  rows,
  blocked,
  payDate,
  prevSnapshots,
  prevLabel,
  prevTotalNet,
}: {
  rows: EmployeeForRun[];
  blocked: EmployeeForRun[];
  payDate: string;
  prevSnapshots: Record<string, PrevSnapshot>;
  prevLabel: string | null;
  prevTotalNet: number;
}) {
  const payable = rows.filter((r) => r.missing.length === 0);

  // Client-side projected numbers. PAYE/NSSA/AIDS are computed
  // authoritatively at Approve time; here we just show the pre-tax
  // projected gross and captured deductions so HR gets a real-shape
  // preview.
  const totalGross = payable.reduce((s, r) => s + grossUsd(r), 0);
  const totalDeduct = payable.reduce(
    // Contractors don't pay statutory — only USD deductions apply.
    // Salaried/Hourly deductions all count.
    (s, r) => s + r.captured_deduct_usd,
    0,
  );
  const prevTotalGross = payable.reduce(
    (s, r) => s + (prevSnapshots[r.employee]?.gross_usd ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Debit summary */}
      <Card className="p-6">
        <h3 className="mb-4 font-bold text-foreground">Debit Summary</h3>
        <dl className="space-y-2 text-sm">
          <Line label="Total projected gross" value={usd(totalGross)} bold />
          <Line label="Captured deductions" value={usd(totalDeduct)} muted />
          <Line
            label="Statutory (PAYE / AIDS Levy / NSSA / ZIMDEF)"
            value="Computed on Approve"
            muted
          />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Actual net (after all statutory deductions) is computed
          authoritatively by the payroll engine when you Approve. The final
          Debit Summary — with true net-vs-previous-net deltas — appears on
          the run detail page.
        </p>
      </Card>

      {/* Missing info warning */}
      {blocked.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-amber-900">
                These people have missing info · {blocked.length} of {rows.length}
              </div>
              <p className="text-sm text-amber-800">
                Warning only — you can still Approve; these employees will not
                be paid on this run until fixed.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {blocked.map((b) => (
              <Link
                key={b.employee}
                href={
                  `/employee/${encodeURIComponent(b.employee)}/edit?from=payroll&fix=${b.missing.join(",")}` as Route
                }
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                ⚠ {b.employee_name} · {b.missing.length} missing
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Payroll changes vs last run */}
      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            Payroll changes · {payable.length} employees
          </span>
          {prevLabel ? (
            <span className="rounded-md border px-3 py-1 text-xs text-muted-foreground">
              Compared to {prevLabel}
            </span>
          ) : (
            <span className="rounded-md border px-3 py-1 text-xs text-muted-foreground">
              No previous run to compare
            </span>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 sticky left-0 z-20 bg-card border-r shadow-[1px_0_0_0_rgb(0_0_0/0.04)]">
                Employee
              </TableHead>
              <TableHead className="px-4 text-right">Gross</TableHead>
              <TableHead className="px-4 text-right">Captured deductions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payable.map((r) => {
              const gross = grossUsd(r);
              const prev = prevSnapshots[r.employee];
              return (
                <TableRow key={r.employee}>
                  <TableCell className="px-4 align-middle sticky left-0 z-10 bg-card border-r shadow-[1px_0_0_0_rgb(0_0_0/0.04)]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {r.employee_name}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                          r.payroll_class === "SALARIED"
                            ? "bg-primary/10 text-primary"
                            : r.payroll_class === "HOURLY"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-purple-100 text-purple-700",
                        )}
                      >
                        {r.payroll_class}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.employee}
                      {r.job_title ? ` · ${r.job_title}` : ""}
                    </div>
                  </TableCell>
                  <DeltaCell current={gross} previous={prev?.gross_usd} />
                  <TableCell className="px-4 align-middle text-right text-rose-600">
                    {r.captured_deduct_usd ? usd(r.captured_deduct_usd) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {payable.length > 0 && (
            <TableFooter>
              <TableRow className="border-t-2 bg-muted/30 font-bold">
                <TableCell className="px-4 sticky left-0 z-10 bg-muted border-r shadow-[1px_0_0_0_rgb(0_0_0/0.04)]">
                  Totals
                </TableCell>
                <TableCell className="px-4 text-right">
                  <div>{usd(totalGross)}</div>
                  {prevLabel && prevTotalGross ? (
                    <div className="text-[11px] font-normal">
                      <DeltaTag
                        current={totalGross}
                        previous={prevTotalGross}
                        fmt={usd}
                        withPercent
                      />
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="px-4 text-right text-rose-600">
                  {totalDeduct ? usd(totalDeduct) : "—"}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
        <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
          Actual net (after PAYE, AIDS Levy, NSSA, ZIMDEF, pension, NEC dues,
          medical aid) is computed by the payroll engine at Approve. It appears
          on the run detail page with a true net-vs-previous-net delta.
        </p>
      </Card>
    </div>
  );
}

function DeltaCell({
  current,
  previous,
  bold,
}: {
  current: number;
  previous?: number;
  bold?: boolean;
}) {
  return (
    <TableCell className="px-4 align-middle text-right">
      <div className={bold ? "font-bold" : ""}>{usd(current)}</div>
      {previous ? (
        <div className="text-[11px]">
          <DeltaTag current={current} previous={previous} fmt={usd} withPercent />
        </div>
      ) : null}
    </TableCell>
  );
}

function Line({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={bold ? "font-bold text-foreground" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd
        className={cn(
          bold
            ? "text-lg font-extrabold text-foreground"
            : muted
            ? "text-emerald-700"
            : "font-semibold text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
