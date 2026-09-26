import Link from "next/link";
import type { Route } from "next";
import { Ratio, ChevronLeft, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { shareBalance } from "@/lib/frappe/accounting-reports";
import { ReportTable } from "@/components/accounting/report-table";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "Share Balance · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string; date?: string };

export default async function ShareBalancePage({ searchParams }: { searchParams: SP }) {
  const companies = await listCompanies();
  const company = searchParams.company || companies[0]?.name || "";
  const today = new Date().toISOString().slice(0, 10);
  const date = searchParams.date || today;

  let report: Awaited<ReturnType<typeof shareBalance>> | null = null;
  let error: string | null = null;
  if (company) {
    try {
      report = await shareBalance({ company, asOfDate: date });
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
        icon={Ratio}
        crumb="Accounting · Shares · Balance"
        title="Share Balance"
        subtitle="Who holds what as of a date."
      />
      <form action="/accounting/shares/balance" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="company" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</label>
          <select id="company" name="company" defaultValue={company} className="h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring">
            {companies.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">As of</label>
          <input id="date" name="date" type="date" defaultValue={date} className="h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring" />
        </div>
        <button type="submit" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
          <Search className="h-3.5 w-3.5" />
          Run report
        </button>
      </form>
      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : !report ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">Pick a company to run the report.</div>
      ) : (
        <ReportTable columns={report.columns} rows={report.result} empty="No share balances as of this date." />
      )}
    </div>
  );
}
