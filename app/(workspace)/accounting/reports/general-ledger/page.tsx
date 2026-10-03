import Link from "next/link";
import type { Route } from "next";
import { BookText, ChevronLeft, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PrintButton } from "@/components/common/print-button";
import { listCompanies } from "@/lib/frappe/accounting";
import { generalLedger } from "@/lib/frappe/accounting-reports";
import { ReportTable } from "@/components/accounting/report-table";
import { PrintableReport, formatPeriod } from "@/components/accounting/printable-report";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "General Ledger · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string; from?: string; to?: string; account?: string };

export default async function GeneralLedgerPage({ searchParams }: { searchParams: SP }) {
  const companies = await listCompanies();
  const company = searchParams.company || companies[0]?.name || "";
  const today = new Date();
  const yStart = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const yEnd = today.toISOString().slice(0, 10);
  const from = searchParams.from || yStart;
  const to = searchParams.to || yEnd;
  const account = searchParams.account;

  let report: Awaited<ReturnType<typeof generalLedger>> | null = null;
  let error: string | null = null;
  if (company) {
    try {
      report = await generalLedger({ company, fromDate: from, toDate: to, account });
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
      <div className="flex flex-col gap-5 print:hidden">
        <BackToReports />
        <PageHeader
          icon={BookText}
          crumb="Accounting · Reports · General Ledger"
          title="General Ledger"
          subtitle="Every posting to every account, in the order it was recorded."
        />

        <FiltersBar
          company={company}
          companies={companies.map((c) => c.name)}
          from={from}
          to={to}
          account={account ?? ""}
          canPrint={Boolean(report)}
        />

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        {!report && !error && (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Pick a company to run the report.
          </div>
        )}
      </div>

      {report && (
        <PrintableReport
          title={account ? `General Ledger — ${account}` : "General Ledger"}
          subtitle="Every posting to every account, in the order it was recorded."
          company={company}
          period={formatPeriod(from, to)}
          showSignatures={false}
        >
          <ReportTable columns={report.columns} rows={report.result} empty="No postings in this range." />
        </PrintableReport>
      )}
    </div>
  );
}

function BackToReports() {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link href={"/accounting?s=reports" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Reports
      </Link>
    </div>
  );
}

function FiltersBar({
  company,
  companies,
  from,
  to,
  account,
  canPrint,
}: {
  company: string;
  companies: string[];
  from: string;
  to: string;
  account: string;
  canPrint: boolean;
}) {
  return (
    <form action="/accounting/reports/general-ledger" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-3">
      <FilterField label="Company" name="company" type="select" value={company} options={companies} />
      <FilterField label="From" name="from" type="date" value={from} />
      <FilterField label="To" name="to" type="date" value={to} />
      <FilterField label="Account (optional)" name="account" type="text" value={account} placeholder="Bank - CH" />
      <div className="ml-auto flex items-end gap-2">
        {canPrint && <PrintButton />}
        <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
          <Search className="h-3.5 w-3.5" />
          Run report
        </button>
      </div>
    </form>
  );
}

function FilterField({
  label,
  name,
  type,
  value,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  type: "text" | "date" | "select";
  value: string;
  options?: string[];
  placeholder?: string;
}) {
  const inputCls = "h-9 rounded-chip border border-input bg-transparent px-3 text-sm focus-ring";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {type === "select" ? (
        <select id={name} name={name} defaultValue={value} className={inputCls}>
          {options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input id={name} name={name} type={type} defaultValue={value} placeholder={placeholder} className={inputCls} />
      )}
    </div>
  );
}
