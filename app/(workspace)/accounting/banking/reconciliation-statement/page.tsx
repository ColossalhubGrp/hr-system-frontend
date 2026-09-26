import Link from "next/link";
import type { Route } from "next";
import { FileSpreadsheet, ChevronLeft, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { bankReconciliationStatement } from "@/lib/frappe/accounting-reports";
import { ReportTable } from "@/components/accounting/report-table";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "Bank Reconciliation Statement · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string; account?: string; date?: string };

export default async function BankReconciliationStatementPage({ searchParams }: { searchParams: SP }) {
  const companies = await listCompanies();
  const company = searchParams.company || companies[0]?.name || "";
  const account = searchParams.account || "";
  const today = new Date().toISOString().slice(0, 10);
  const date = searchParams.date || today;
  const accountOptions = company ? await listAccounts(company, { limit: 200 }) : [];

  let report: Awaited<ReturnType<typeof bankReconciliationStatement>> | null = null;
  let error: string | null = null;
  if (company && account) {
    try {
      report = await bankReconciliationStatement({ company, account, reportDate: date });
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
        icon={FileSpreadsheet}
        crumb="Accounting · Banking · Reconciliation Statement"
        title="Bank Reconciliation Statement"
        subtitle="Cleared vs uncleared postings against a bank account, as of a date."
      />

      <form action="/accounting/banking/reconciliation-statement" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-3">
        <FSel label="Company" name="company" value={company} options={companies.map((c) => c.name)} />
        <FSel label="Bank account" name="account" value={account} options={[""].concat(accountOptions.map((a) => a.name))} />
        <FDate label="As of" name="date" value={date} />
        <button type="submit" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
          <Search className="h-3.5 w-3.5" />
          Run report
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : !report ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Pick a company and bank account to run the report.
        </div>
      ) : (
        <ReportTable columns={report.columns} rows={report.result} empty="Nothing uncleared as of this date." />
      )}
    </div>
  );
}

function FSel({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select id={name} name={name} defaultValue={value} className="h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring">
        {options.map((o) => <option key={o || "any"} value={o}>{o || "—"}</option>)}
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
