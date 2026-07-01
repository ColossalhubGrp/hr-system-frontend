"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { RequestMissingDetailsDialog } from "@/components/payroll/request-missing-details-dialog";
import {
  approveRunAction,
  markRunPaidAction,
  saveStubsAction,
  setupRunAction,
} from "@/app/(workspace)/payroll/actions";
import { calculatePay } from "@/lib/payroll-engine/math";
import type {
  PayCalculation,
  PayType,
  PayRunStatus,
  TaxRule,
} from "@/lib/payroll-engine/types";

// ── Types ────────────────────────────────────────────────────────────

export interface WizardRow {
  slipName: string;
  employee: string;
  employeeName: string;
  payType: PayType;
  annualSalary: number;
  department: string | null;
  designation: string | null;
  missingFields: string[];
  grossPay: number;
  netPay: number;
  totalDeduction: number;
  included: boolean;
}

/** Per-row editable inputs. */
interface RowOverrides {
  hoursWorked: number;
  overtimeHours: number;
  additionalPay: number;
  reimbursements: number;
  retirementPct: number;
  state: string;
  hourlyRate: number;
  flatPay: number;
  included: boolean;
}

const STEPS = ["Missing details", "Salaried", "Hourly", "Contractors", "Preview"] as const;
type StepKey = (typeof STEPS)[number];

// ── Component ───────────────────────────────────────────────────────

export function RunWizard({
  payRunId,
  rows: initialRows,
  taxRules,
  currentStatus,
  scheduleType,
  payDate,
}: {
  payRunId: string;
  rows: WizardRow[];
  taxRules: TaxRule[];
  currentStatus: PayRunStatus;
  scheduleType: string;
  payDate: string;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [status, setStatus] = useState<PayRunStatus>(currentStatus);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Per-row local state — every edit triggers a recompute against tax rules.
  const [overrides, setOverrides] = useState<Record<string, RowOverrides>>(() => {
    const out: Record<string, RowOverrides> = {};
    for (const r of initialRows) {
      out[r.slipName] = {
        hoursWorked: r.payType === "HOURLY" ? 80 : 0,
        overtimeHours: 0,
        additionalPay: 0,
        reimbursements: 0,
        retirementPct: 0,
        state: "CA",
        hourlyRate: r.payType === "HOURLY" ? Math.round((r.annualSalary || 60000) / 2080) : 0,
        flatPay: r.payType === "CONTRACTOR" ? r.grossPay || 0 : 0,
        included: r.included,
      };
    }
    return out;
  });

  function patch(slip: string, change: Partial<RowOverrides>) {
    setOverrides((o) => ({ ...o, [slip]: { ...o[slip]!, ...change } }));
  }

  // Live-computed pay per row, recomputed on every overrides change.
  const calcByRow = useMemo(() => {
    const out: Record<string, PayCalculation> = {};
    for (const r of initialRows) {
      const ov = overrides[r.slipName]!;
      out[r.slipName] = calculatePay(
        {
          payType: r.payType,
          annualSalary: r.annualSalary,
          hourlyRate: ov.hourlyRate,
          flatPay: ov.flatPay,
          state: ov.state,
          retirementPct: ov.retirementPct,
          hoursWorked: ov.hoursWorked,
          overtimeHours: ov.overtimeHours,
          additionalPay: ov.additionalPay,
          reimbursements: ov.reimbursements,
        },
        taxRules,
      );
    }
    return out;
  }, [initialRows, overrides, taxRules]);

  const blocked = initialRows.filter((r) => r.missingFields.length > 0);
  const salaried = initialRows.filter((r) => r.payType === "SALARY");
  const hourly = initialRows.filter((r) => r.payType === "HOURLY");
  const contractors = initialRows.filter((r) => r.payType === "CONTRACTOR");

  const stepKey: StepKey = STEPS[stepIdx]!;

  // ── Actions ────────────────────────────────────────────────────

  function runSetup() {
    setBanner(null);
    startTransition(async () => {
      const res = await setupRunAction(payRunId);
      if (res.error) setBanner(res.error);
      else setBanner("Pay stubs refreshed. Reload to see them.");
    });
  }

  function saveAndContinue(nextIdx: number) {
    setBanner(null);
    startTransition(async () => {
      // Persist only the rows whose `included` was toggled (the
      // earnings-grid edits live client-side until Approve).
      const changed = initialRows
        .filter((r) => overrides[r.slipName]?.included !== r.included)
        .map((r) => ({ name: r.slipName, included: overrides[r.slipName]!.included }));
      if (changed.length > 0) {
        const res = await saveStubsAction(changed);
        if (res.error) {
          setBanner(res.error);
          return;
        }
      }
      setStepIdx(nextIdx);
    });
  }

  function approve() {
    setBanner(null);
    startTransition(async () => {
      const res = await approveRunAction(payRunId);
      if (res.error) {
        setBanner(res.error);
        return;
      }
      setStatus("APPROVED");
      setBanner("Approved. Pay run submitted.");
    });
  }

  function markPaid() {
    setBanner(null);
    startTransition(async () => {
      const res = await markRunPaidAction(payRunId);
      if (res.error) {
        setBanner(res.error);
        return;
      }
      setStatus("PAID");
      setBanner("Marked paid.");
    });
  }

  // ── Totals (for preview) ───────────────────────────────────────

  const totals = useMemo(() => {
    let grossPay = 0,
      employeeTax = 0,
      employerTax = 0,
      netPay = 0;
    for (const r of initialRows) {
      if (!overrides[r.slipName]?.included) continue;
      const c = calcByRow[r.slipName]!;
      grossPay += c.grossPay;
      employeeTax +=
        c.federalTax + c.stateTax + c.socialSecurity + c.medicare;
      employerTax +=
        c.employerSocialSecurity +
        c.employerMedicare +
        c.employerFuta +
        c.employerSuta +
        c.employerOther;
      netPay += c.netPay;
    }
    const totalDebit = netPay + employeeTax + employerTax;
    return { grossPay, employeeTax, employerTax, netPay, totalDebit };
  }, [initialRows, overrides, calcByRow]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <Stepper
        steps={[...STEPS]}
        idx={stepIdx}
        onJump={(i) => setStepIdx(i)}
        counts={[blocked.length, salaried.length, hourly.length, contractors.length, initialRows.length]}
      />

      {banner && (
        <Card className="border-amber-300/50 bg-amber-50/40 p-3 text-sm">
          {banner}
        </Card>
      )}

      <div className="min-h-[400px]">
        {stepKey === "Missing details" && (
          <MissingStep blocked={blocked} onRefresh={runSetup} pending={pending} />
        )}
        {stepKey === "Salaried" && (
          <EarningsGrid
            rows={salaried}
            overrides={overrides}
            calcByRow={calcByRow}
            patch={patch}
            columns="salaried"
          />
        )}
        {stepKey === "Hourly" && (
          <EarningsGrid
            rows={hourly}
            overrides={overrides}
            calcByRow={calcByRow}
            patch={patch}
            columns="hourly"
          />
        )}
        {stepKey === "Contractors" && (
          <EarningsGrid
            rows={contractors}
            overrides={overrides}
            calcByRow={calcByRow}
            patch={patch}
            columns="contractor"
          />
        )}
        {stepKey === "Preview" && (
          <PreviewStep
            rows={initialRows}
            overrides={overrides}
            calcByRow={calcByRow}
            totals={totals}
            scheduleType={scheduleType}
            payDate={payDate}
          />
        )}
      </div>

      <NavBar
        stepIdx={stepIdx}
        canBack={stepIdx > 0}
        canNext={stepIdx < STEPS.length - 1}
        pending={pending}
        status={status}
        onBack={() => setStepIdx((i) => Math.max(0, i - 1))}
        onNext={() => saveAndContinue(stepIdx + 1)}
        onApprove={approve}
        onMarkPaid={markPaid}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Stepper({
  steps,
  idx,
  onJump,
  counts,
}: {
  steps: string[];
  idx: number;
  onJump: (i: number) => void;
  counts: number[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((label, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onJump(i)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
              active
                ? "border-primary bg-primary text-primary-foreground font-medium"
                : done
                  ? "border-input bg-muted text-foreground"
                  : "border-input text-muted-foreground hover:border-foreground/30",
            )}
          >
            <span className="font-semibold">{i + 1}</span>
            <span>{label}</span>
            {typeof counts[i] === "number" && counts[i]! > 0 && (
              <Badge
                variant={active ? "secondary" : "outline"}
                className={cn(active && "bg-primary-foreground/20 text-primary-foreground")}
              >
                {counts[i]}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MissingStep({
  blocked,
  onRefresh,
  pending,
}: {
  blocked: WizardRow[];
  onRefresh: () => void;
  pending: boolean;
}) {
  if (blocked.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-8 w-8 text-rise" />
          <h2 className="text-lg font-semibold">Nothing missing</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Every employee in this run has the information we need.
            Continue to the next step.
          </p>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Recalculate pay stubs
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {blocked.length} employee{blocked.length === 1 ? "" : "s"} blocked
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These employees can't be paid until their missing details are
            added. They're excluded from the run automatically.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Recalculate
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Employee</TableHead>
              <TableHead className="px-5">Designation</TableHead>
              <TableHead className="px-5">Missing</TableHead>
              <TableHead className="px-5 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocked.map((r) => (
              <TableRow key={r.slipName}>
                <TableCell className="px-5 align-top">
                  <p className="font-medium text-foreground">{r.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{r.employee}</p>
                </TableCell>
                <TableCell className="px-5 align-top text-sm">
                  {r.designation ?? "—"}
                  {r.department && (
                    <p className="text-xs text-muted-foreground">{r.department}</p>
                  )}
                </TableCell>
                <TableCell className="px-5 align-top">
                  <ul className="space-y-0.5 text-xs text-destructive">
                    {r.missingFields.map((m) => (
                      <li key={m}>• {m}</li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell className="px-5 text-right align-top">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <a href={`/employee/${encodeURIComponent(r.employee)}`}>
                        <UserCheck className="h-3.5 w-3.5" />
                        Add details
                      </a>
                    </Button>
                    <RequestMissingDetailsDialog
                      employeeId={r.employee}
                      employeeName={r.employeeName}
                      missing={r.missingFields}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function EarningsGrid({
  rows,
  overrides,
  calcByRow,
  patch,
  columns,
}: {
  rows: WizardRow[];
  overrides: Record<string, RowOverrides>;
  calcByRow: Record<string, PayCalculation>;
  patch: (slip: string, change: Partial<RowOverrides>) => void;
  columns: "salaried" | "hourly" | "contractor";
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No {columns} workers in this run.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-3">Include</TableHead>
            <TableHead className="px-3">Employee</TableHead>
            {columns === "hourly" && (
              <>
                <TableHead className="px-3 text-right">Rate</TableHead>
                <TableHead className="px-3 text-right">Hours</TableHead>
                <TableHead className="px-3 text-right">OT hrs</TableHead>
              </>
            )}
            {columns === "contractor" && (
              <TableHead className="px-3 text-right">Flat pay</TableHead>
            )}
            <TableHead className="px-3 text-right">Additional</TableHead>
            <TableHead className="px-3 text-right">Reimburse</TableHead>
            <TableHead className="px-3 text-right">Gross</TableHead>
            <TableHead className="px-3 text-right">Withholding</TableHead>
            <TableHead className="px-3 text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const ov = overrides[r.slipName]!;
            const c = calcByRow[r.slipName]!;
            const blocked = r.missingFields.length > 0;
            const withholding =
              c.federalTax + c.stateTax + c.socialSecurity + c.medicare + c.retirement401k;
            return (
              <TableRow key={r.slipName} className={cn(blocked && "opacity-60")}>
                <TableCell className="px-3 align-top">
                  <input
                    type="checkbox"
                    checked={ov.included && !blocked}
                    disabled={blocked}
                    onChange={(e) => patch(r.slipName, { included: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  {blocked && (
                    <p className="mt-1 text-[10px] text-destructive">blocked</p>
                  )}
                </TableCell>
                <TableCell className="px-3 align-top">
                  <p className="text-sm font-medium">{r.employeeName}</p>
                  <p className="text-[10px] text-muted-foreground">{r.employee}</p>
                </TableCell>
                {columns === "hourly" && (
                  <>
                    <NumCell value={ov.hourlyRate} onChange={(v) => patch(r.slipName, { hourlyRate: v })} />
                    <NumCell value={ov.hoursWorked} onChange={(v) => patch(r.slipName, { hoursWorked: v })} />
                    <NumCell value={ov.overtimeHours} onChange={(v) => patch(r.slipName, { overtimeHours: v })} />
                  </>
                )}
                {columns === "contractor" && (
                  <NumCell value={ov.flatPay} onChange={(v) => patch(r.slipName, { flatPay: v })} />
                )}
                <NumCell value={ov.additionalPay} onChange={(v) => patch(r.slipName, { additionalPay: v })} />
                <NumCell value={ov.reimbursements} onChange={(v) => patch(r.slipName, { reimbursements: v })} />
                <ReadCell value={c.grossPay} />
                <ReadCell value={withholding} tone="fall" prefix="−" />
                <ReadCell value={c.netPay} bold />
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function NumCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <TableCell className="px-2 text-right align-top">
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8 w-24 text-right"
      />
    </TableCell>
  );
}

function ReadCell({
  value,
  tone,
  prefix,
  bold,
}: {
  value: number;
  tone?: "fall";
  prefix?: string;
  bold?: boolean;
}) {
  return (
    <TableCell
      className={cn(
        "px-3 text-right align-top text-sm tabular-nums",
        tone === "fall" && "text-fall",
        bold && "font-semibold",
      )}
    >
      {value > 0 ? `${prefix ?? ""}${value.toLocaleString("en", { minimumFractionDigits: 2 })}` : "—"}
    </TableCell>
  );
}

function PreviewStep({
  rows,
  overrides,
  calcByRow,
  totals,
  scheduleType,
  payDate,
}: {
  rows: WizardRow[];
  overrides: Record<string, RowOverrides>;
  calcByRow: Record<string, PayCalculation>;
  totals: { grossPay: number; employeeTax: number; employerTax: number; netPay: number; totalDebit: number };
  scheduleType: string;
  payDate: string;
}) {
  const included = rows.filter((r) => overrides[r.slipName]?.included);
  return (
    <div className="space-y-6">
      {/* Debit summary */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Debit summary
        </h2>
        <Card className="mt-2">
          <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <Line label="Direct deposits" value={totals.netPay} />
            <Line label="Employee taxes" value={totals.employeeTax} />
            <Line label="Employer taxes" value={totals.employerTax} />
            <div className="sm:col-span-3 border-t pt-3">
              <Line label="Total debit" value={totals.totalDebit} bold large />
              <p className="mt-1 text-xs text-muted-foreground">
                Debited on {payDate ?? "the pay date"} · {scheduleType || "schedule unset"} · {included.length} of {rows.length} employees
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Per-employee table */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Per-employee breakdown
        </h2>
        <Card className="mt-2 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">Employee</TableHead>
                <TableHead className="px-5 text-right">Gross</TableHead>
                <TableHead className="px-5 text-right">Withholding</TableHead>
                <TableHead className="px-5 text-right">Employer tax</TableHead>
                <TableHead className="px-5 text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const c = calcByRow[r.slipName]!;
                const ov = overrides[r.slipName]!;
                if (!ov.included) return null;
                const wh = c.federalTax + c.stateTax + c.socialSecurity + c.medicare + c.retirement401k;
                const er = c.employerSocialSecurity + c.employerMedicare + c.employerFuta + c.employerSuta + c.employerOther;
                return (
                  <TableRow key={r.slipName}>
                    <TableCell className="px-5 align-top">
                      <p className="text-sm font-medium">{r.employeeName}</p>
                      <p className="text-[10px] text-muted-foreground">{r.payType}</p>
                    </TableCell>
                    <TableCell className="px-5 text-right tabular-nums">{c.grossPay.toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="px-5 text-right tabular-nums text-fall">−{wh.toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="px-5 text-right tabular-nums text-muted-foreground">{er.toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="px-5 text-right font-semibold tabular-nums">{c.netPay.toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        Approve to submit the pay run (locks it). Then mark as paid to
        create the bank entry.
      </p>
    </div>
  );
}

function Line({ label, value, bold, large }: { label: string; value: number; bold?: boolean; large?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn("text-sm text-muted-foreground", bold && "text-foreground")}>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          bold && "font-semibold",
          large ? "text-xl" : "text-sm",
        )}
      >
        {value.toLocaleString("en", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}

function NavBar({
  stepIdx,
  canBack,
  canNext,
  pending,
  status,
  onBack,
  onNext,
  onApprove,
  onMarkPaid,
}: {
  stepIdx: number;
  canBack: boolean;
  canNext: boolean;
  pending: boolean;
  status: PayRunStatus;
  onBack: () => void;
  onNext: () => void;
  onApprove: () => void;
  onMarkPaid: () => void;
}) {
  const onPreview = stepIdx === STEPS.length - 1;
  return (
    <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/95 p-3 shadow backdrop-blur">
      <Button variant="ghost" onClick={onBack} disabled={!canBack || pending}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        {onPreview && status === "DRAFT" && (
          <Button onClick={onApprove} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve
          </Button>
        )}
        {onPreview && status === "APPROVED" && (
          <Button onClick={onMarkPaid} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Mark paid
          </Button>
        )}
        {onPreview && status === "PAID" && (
          <Badge className="bg-rise text-white">✓ Paid</Badge>
        )}
        {canNext && !onPreview && (
          <Button onClick={onNext} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
