import Link from "next/link";
import type { Route } from "next";
import {
  Receipt,
  Plus,
  FileText,
  CheckCircle2,
  Coins,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { listSalesInvoices, type SalesInvoiceRow } from "@/lib/frappe/sales-invoice";

export const metadata = { title: "Sales Invoices · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { status?: string; page?: string };

const STATUS_OPTIONS = [
  "All",
  "Draft",
  "Return",
  "Credit Note Issued",
  "Submitted",
  "Paid",
  "Unpaid",
  "Unpaid and Discounted",
  "Overdue",
  "Cancelled",
];

export default async function SalesInvoicesPage({ searchParams }: { searchParams: SP }) {
  const status = searchParams.status || "All";
  const page = Number(searchParams.page ?? 1) || 1;

  const result = await listSalesInvoices({
    status: status === "All" ? undefined : status,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={Receipt}
        crumb="Accounting · Sales Invoices"
        title="Sales Invoices"
        subtitle={`${result.total.toLocaleString()} invoices in view.`}
        actions={
          <Link
            href={"/accounting/sales-invoices/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New invoice
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryTile label="Draft" value={result.counts.draft} hint="Not yet posted" icon={FileText} tone="amber" />
        <SummaryTile label="Submitted" value={result.counts.submitted} hint="Posted to the ledger" icon={CheckCircle2} tone="rise" />
        <SummaryTile label="Paid" value={result.counts.paid} hint="Fully settled" icon={CheckCircle2} tone="rise" />
        <SummaryTile label="Overdue" value={result.counts.overdue} hint="Past due date" icon={AlertTriangle} tone="fall" />
        <SummaryTile label="Outstanding" value={formatMoney(result.counts.outstandingTotal)} hint="Sum owed" icon={Coins} tone="ink" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusFilterPills active={status} />
      </div>

      <DataTable<SalesInvoiceRow>
        rows={result.rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/sales-invoices/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No sales invoices match this view.</p>
          </div>
        }
        columns={[
          { header: "Invoice", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "Customer", cell: (r) => r.customerName ?? r.customer },
          { header: "Date", cell: (r) => r.postingDate, className: "hidden md:table-cell" },
          { header: "Due", cell: (r) => r.dueDate ?? "—", className: "hidden lg:table-cell" },
          {
            header: "Total",
            cell: (r) => `${r.currency} ${formatMoney(r.grandTotal)}`,
            className: "text-right tabular-nums",
          },
          {
            header: "Outstanding",
            cell: (r) => (
              <span className={r.outstandingAmount > 0 ? "font-semibold text-fall" : "text-muted-foreground"}>
                {r.currency} {formatMoney(r.outstandingAmount)}
              </span>
            ),
            className: "text-right tabular-nums",
          },
          { header: "Status", cell: (r) => <StatusPill status={r.status || docstatusLabel(r.docstatus)} /> },
        ]}
      />

      {result.total > result.pageSize && (
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} sp={searchParams} />
      )}
    </div>
  );
}

function StatusFilterPills({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-chip border border-border/60 bg-muted/20 p-0.5">
      {STATUS_OPTIONS.map((s) => {
        const params = new URLSearchParams();
        if (s !== "All") params.set("status", s);
        return (
          <Link
            key={s}
            href={`/accounting/sales-invoices?${params.toString()}` as Route}
            className={`rounded-chip px-3 py-1 text-xs font-semibold transition ${
              active === s ? "bg-ink-800 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </Link>
        );
      })}
    </div>
  );
}

function Pagination({ page, pageSize, total, sp }: { page: number; pageSize: number; total: number; sp: SP }) {
  const build = (n: number) => {
    const p = new URLSearchParams();
    if (sp.status) p.set("status", sp.status);
    p.set("page", String(n));
    return `/accounting/sales-invoices?${p.toString()}`;
  };
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={build(page - 1) as Route} className="rounded-chip border border-input px-3 py-1 hover:bg-muted/40">
            Previous
          </Link>
        )}
        {page * pageSize < total && (
          <Link href={build(page + 1) as Route} className="rounded-chip border border-input px-3 py-1 hover:bg-muted/40">
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

function docstatusLabel(d: 0 | 1 | 2): string {
  return d === 0 ? "Draft" : d === 1 ? "Submitted" : "Cancelled";
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
