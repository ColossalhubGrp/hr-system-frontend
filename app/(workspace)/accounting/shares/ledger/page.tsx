import Link from "next/link";
import type { Route } from "next";
import { BookText, ChevronLeft, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { listShareholders } from "@/lib/frappe/shares/shareholder";
import { shareLedger } from "@/lib/frappe/accounting-reports";
import { ReportTable } from "@/components/accounting/report-table";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "Share Ledger · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string; shareholder?: string; from?: string; to?: string };

export default async function ShareLedgerPage({ searchParams }: { searchParams: SP }) {
  const [companies, shareholders] = await Promise.all([listCompanies(), listShareholders()]);
  const company = searchParams.company || companies[0]?.name || "";
  const shareholder = searchParams.shareholder || "";
  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.from || "";
  const to = searchParams.to || today;

  let report: Awaited<ReturnType<typeof shareLedger>> | null = null;
  let error: string | null = null;
  if (company) {
    try {
      report = await shareLedger({ company, shareholder: shareholder || undefined, fromDate: from || undefined, toDate: to });
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
        icon={BookText}
        crumb="Accounting · Shares · Ledger"
        title="Share Ledger"
        subtitle="Every issue, buy-back and transfer in chronological order."
      />
      <form action="/accounting/shares/ledger" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-3">
        <FSel label="Company" name="company" value={company} options={companies.map((c) => c.name)} />
        <FSel label="Shareholder" name="shareholder" value={shareholder} options={[""].concat(shareholders.map((s) => s.name))} />
        <FDate label="From" name="from" value={from} />
        <FDate label="To" name="to" value={to} />
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
        <ReportTable columns={report.columns} rows={report.result} empty="No share transactions in this range." />
      )}
    </div>
  );
}

function FSel({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select id={name} name={name} defaultValue={value} className="h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring">
        {options.map((o) => <option key={o || "any"} value={o}>{o || "All shareholders"}</option>)}
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
