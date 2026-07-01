import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listPayRuns, listPayStubsForRun } from "@/lib/payroll-engine/server";
import { getTaxRules } from "@/lib/payroll-engine/server";
import { listPayrollEmployees } from "@/lib/payroll-engine/doctype-helpers";
import { RunWizard } from "@/components/payroll/run-wizard";

export const metadata = { title: "Run payroll · Colossal HR" };

export default async function RunWizardPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [runs, stubs, employees, taxRules] = await Promise.all([
    listPayRuns(),
    listPayStubsForRun(id),
    listPayrollEmployees(),
    getTaxRules(),
  ]);
  const run = runs.find((r) => r.id === id);
  if (!run) notFound();

  // Merge: every Salary Slip in the run, enriched with the matching
  // employee record so the wizard knows pay type, missing fields, etc.
  const wizardRows = stubs.map((s) => {
    const e = employees.find((x) => x.name === s.employee);
    return {
      slipName: s.id,
      employee: s.employee,
      employeeName: s.employeeName,
      payType: e?.payType ?? "SALARY",
      annualSalary: e?.annualSalary ?? 0,
      department: e?.department ?? null,
      designation: e?.designation ?? null,
      missingFields: e?.missingFields ?? [],
      // Existing snapshot from Frappe — wizard treats these as starting values
      grossPay: s.grossPay,
      netPay: s.netPay,
      totalDeduction: s.totalDeduction,
      included: s.included,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1 text-xs text-muted-foreground">
        <Link href={`/payroll/${encodeURIComponent(run.id)}` as Route}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to {run.id}
        </Link>
      </Button>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Play className="h-3.5 w-3.5" />
          Payroll · Run wizard · {run.label}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Run payroll
        </h1>
        <p className="text-sm text-muted-foreground">
          {wizardRows.length} draft pay stub{wizardRows.length === 1 ? "" : "s"}.
          Step through to resolve blockers, review per-employee totals,
          and approve.
        </p>
      </header>

      <RunWizard
        payRunId={run.id}
        rows={wizardRows}
        taxRules={taxRules}
        currentStatus={run.status}
        scheduleType={run.scheduleType}
        payDate={run.payDate}
      />
    </div>
  );
}
