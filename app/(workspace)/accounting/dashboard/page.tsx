import Link from "next/link";
import type { Route } from "next";
import {
  BarChart3,
  ChevronLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  ReceiptText,
  FileOutput,
  FileInput,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { listCompanies } from "@/lib/frappe/accounting";
import { getAccountingDashboardTotals, getYtdPnl } from "@/lib/frappe/accounting-dashboard";
import { PnlChart } from "@/components/accounting/pnl-chart";

export const metadata = { title: "Accounting Dashboard · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { company?: string };

export default async function AccountingDashboardPage({ searchParams }: { searchParams: SP }) {
  const companies = await listCompanies();
  const company = searchParams.company || companies[0]?.name || "";
  const [totals, pnl] = company
    ? await Promise.all([getAccountingDashboardTotals(company), getYtdPnl(company)])
    : [null, []];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={BarChart3}
        crumb="Accounting · Dashboard"
        title="Accounting Dashboard"
        subtitle={company ? `Snapshot for ${company}.` : "Pick a company to see numbers."}
        actions={<CompanyPicker companies={companies.map((c) => c.name)} active={company} />}
      />

      {!company || !totals ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Set up a company first from Masters → Company.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile
              label="Total Outgoing Bills"
              value={money(totals.totalOutgoingBills)}
              hint="Submitted Purchase Invoices"
              icon={ReceiptText}
              tone="fall"
            />
            <SummaryTile
              label="Total Incoming Bills"
              value={money(totals.totalIncomingBills)}
              hint="Submitted Sales Invoices"
              icon={Receipt}
              tone="rise"
            />
            <SummaryTile
              label="Total Incoming Payment"
              value={money(totals.totalIncomingPayment)}
              hint="Submitted Receive Payment Entries"
              icon={ArrowDownToLine}
              tone="rise"
            />
            <SummaryTile
              label="Total Outgoing Payment"
              value={money(totals.totalOutgoingPayment)}
              hint="Submitted Pay Payment Entries"
              icon={ArrowUpFromLine}
              tone="fall"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryTile
              label="Accounts Receivable"
              value={money(totals.accountsReceivableOutstanding)}
              hint="Sales Invoices still owed to us"
              icon={FileOutput}
              tone="ink"
            />
            <SummaryTile
              label="Accounts Payable"
              value={money(totals.accountsPayableOutstanding)}
              hint="Purchase Invoices we still owe"
              icon={FileInput}
              tone="ink"
            />
          </div>

          <PnlChart data={pnl} />

          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Jump to</h2>
            <div className="flex flex-wrap gap-2">
              <ShortcutLink href={"/accounting/reports/general-ledger" as Route}>General Ledger</ShortcutLink>
              <ShortcutLink href={"/accounting/reports/trial-balance" as Route}>Trial Balance</ShortcutLink>
              <ShortcutLink href={"/accounting/reports/profit-and-loss" as Route}>Profit and Loss</ShortcutLink>
              <ShortcutLink href={"/accounting/reports/balance-sheet" as Route}>Balance Sheet</ShortcutLink>
              <ShortcutLink href={"/accounting/reports/cash-flow" as Route}>Cash Flow</ShortcutLink>
              <ShortcutLink href={"/accounting/reports/accounts-receivable" as Route}>AR aging</ShortcutLink>
              <ShortcutLink href={"/accounting/reports/accounts-payable" as Route}>AP aging</ShortcutLink>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CompanyPicker({ companies, active }: { companies: string[]; active: string }) {
  if (companies.length <= 1) return null;
  return (
    <form action="/accounting/dashboard" className="flex items-center gap-2">
      <label htmlFor="company" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Company
      </label>
      <select id="company" name="company" defaultValue={active} className="h-9 rounded-chip border border-input bg-transparent px-2 text-sm focus-ring">
        {companies.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" className="rounded-chip border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted/40">
        Switch
      </button>
    </form>
  );
}

function ShortcutLink({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-chip border border-input px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40">
      {children}
    </Link>
  );
}

function money(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
