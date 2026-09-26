import Link from "next/link";
import type { Route } from "next";
import { Layers, ChevronLeft, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { balanceSheet } from "@/lib/frappe/accounting-reports";
import { ReportTable } from "@/components/accounting/report-table";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "Balance Sheet · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string; to?: string; periodicity?: string };

const PERIODICITIES = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];

export default async function BalanceSheetPage({ searchParams }: { searchParams: SP }) {
  const companies = await listCompanies();
  const company = searchParams.company || companies[0]?.name || "";
  const today = new Date();
  const yEnd = today.toISOString().slice(0, 10);
  const to = searchParams.to || yEnd;
  const periodicity = searchParams.periodicity || "Yearly";

  let report: Awaited<ReturnType<typeof balanceSheet>> | null = null;
  let error: string | null = null;
  if (company) {
    try {
      report = await balanceSheet({ company, toDate: to, periodicity });
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
        icon={Layers}
        crumb="Accounting · Reports · Balance Sheet"
        title="Balance Sheet"
        subtitle="Assets, Liabilities and Equity as of a date."
      />

      <form action="/accounting/reports/balance-sheet" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-3">
        <FSelect label="Company" name="company" value={company} options={companies.map((c) => c.name)} />
        <FDate label="As of" name="to" value={to} />
        <FSelect label="Periodicity" name="periodicity" value={periodicity} options={PERIODICITIES} />
        <button type="submit" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
          <Search className="h-3.5 w-3.5" />
          Run report
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : !report ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Pick a company to run the report.
        </div>
      ) : (
        <ReportTable columns={report.columns} rows={report.result} empty="Balance sheet is empty as of this date." />
      )}
    </div>
  );
}

function FSelect({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select id={name} name={name} defaultValue={value} className="h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FDate({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input id={name} name={name} type="date" defaultValue={value} className="h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring" />
    </div>
  );
}
