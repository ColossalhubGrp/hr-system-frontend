import Link from "next/link";
import type { Route } from "next";
import { LineChart, ChevronLeft, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { listFiscalYears } from "@/lib/frappe/masters/fiscal-year";
import { budgetVariance } from "@/lib/frappe/accounting-reports";
import { ReportTable } from "@/components/accounting/report-table";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "Budget Variance · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string; year?: string; period?: string; against?: string };

const PERIODS = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];
const AGAINST = ["Cost Center", "Project", "Accounting Dimension"];

export default async function BudgetVariancePage({ searchParams }: { searchParams: SP }) {
  const [companies, fys] = await Promise.all([listCompanies(), listFiscalYears()]);
  const company = searchParams.company || companies[0]?.name || "";
  const fy = searchParams.year || fys[0]?.name || "";
  const period = searchParams.period || "Monthly";
  const against = searchParams.against || "Cost Center";

  let report: Awaited<ReturnType<typeof budgetVariance>> | null = null;
  let error: string | null = null;
  if (company && fy) {
    try {
      report = await budgetVariance({ company, fiscalYear: fy, period, budgetAgainst: against });
    } catch (e) {
      error =
        e instanceof FrappeRequestError
          ? e.message || `Backend error (${e.status})`
          : e instanceof Error
          ? e.message
          : "Could not run the report.";
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={LineChart}
        crumb="Accounting · Reports · Budget Variance"
        title="Budget Variance"
        subtitle="Budget vs actuals per Cost Center / Project, sliced by period."
      />

      <form action="/accounting/reports/budget-variance" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-3">
        <FSel label="Company" name="company" value={company} options={companies.map((c) => c.name)} />
        <FSel label="Fiscal year" name="year" value={fy} options={fys.map((y) => y.name)} />
        <FSel label="Period" name="period" value={period} options={PERIODS} />
        <FSel label="Against" name="against" value={against} options={AGAINST} />
        <button type="submit" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
          <Search className="h-3.5 w-3.5" />
          Run report
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : !report ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Pick a company + fiscal year to run the report.
        </div>
      ) : (
        <ReportTable columns={report.columns} rows={report.result} empty="No variance rows for this period." />
      )}
    </div>
  );
}

function FSel({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select id={name} name={name} defaultValue={value} className="h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
