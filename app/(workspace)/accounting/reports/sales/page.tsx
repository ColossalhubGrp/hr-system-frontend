import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, LineChart, Search, Download } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PrintButton } from "@/components/common/print-button";
import { PrintableReport, formatPeriod } from "@/components/accounting/printable-report";
import { DateRangeFields } from "@/components/common/date-range-fields";
import { listCompanies } from "@/lib/frappe/accounting";
import { frappeCall } from "@/lib/frappe/client";
import { FrappeRequestError } from "@/lib/frappe/client";

export const metadata = { title: "Sales report · Accounting · Colossal Suite" };
export const dynamic = "force-dynamic";

type Row = {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date: string | null;
  company: string;
  currency: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  docstatus: number;
};

type SP = { company?: string; from?: string; to?: string };

export default async function SalesReportPage({ searchParams }: { searchParams: SP }) {
  const companies = await listCompanies();
  const company = searchParams.company || companies[0]?.name || "";
  const today = new Date();
  // Default range: start of the current month → today. Matches how
  // sales teams scan the current pipeline each day without resetting.
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayISO = today.toISOString().slice(0, 10);
  const from = searchParams.from || monthStart;
  const to = searchParams.to || todayISO;

  let rows: Row[] = [];
  let error: string | null = null;
  if (company) {
    try {
      rows = await loadRows(company, from, to);
    } catch (e) {
      error =
        e instanceof FrappeRequestError
          ? e.message || `Backend error (${e.status})`
          : e instanceof Error
          ? e.message
          : "Could not run the report.";
    }
  }

  const totals = rows.reduce(
    (acc, r) => {
      if (r.docstatus === 2) return acc; // cancelled
      acc.count += 1;
      acc.invoiced += Number(r.grand_total) || 0;
      acc.outstanding += Number(r.outstanding_amount) || 0;
      return acc;
    },
    { count: 0, invoiced: 0, outstanding: 0 },
  );
  const paid = totals.invoiced - totals.outstanding;
  const currency = rows[0]?.currency || "USD";

  // CSV export is a plain anchor to a route-handler that serves text/csv
  // with the current query string. Keeping it a GET means the browser's
  // "Save as" works and the download picks up the same date filter.
  const csvHref = `/accounting/reports/sales/export?${new URLSearchParams({
    company,
    from,
    to,
  }).toString()}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 print:hidden">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={"/accounting?s=reports" as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Reports
        </Link>
      </div>
      <PageHeader
        icon={LineChart}
        crumb="Accounting · Reports · Sales"
        title="Sales report"
        subtitle="Every sales invoice posted in the chosen date range, with totals and outstanding."
      />

      <form
        action="/accounting/reports/sales"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3"
      >
        <Field label="Company" name="company" type="select" value={company} options={companies.map((c) => c.name)} />
        <DateRangeFields fromName="from" toName="to" defaultFrom={from} defaultTo={to} />
        <div className="ml-auto flex items-end gap-2">
          {rows.length > 0 && <PrintButton />}
          <a
            href={csvHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Download className="h-3 w-3" />
            CSV
          </a>
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Search className="h-3 w-3" />
            Run
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Totals strip — 4 tiles above the table. Reads out the headline
          numbers so the user doesn't have to sum the table in their head. */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Invoices" value={String(totals.count)} />
        <Tile label="Invoiced" value={fmt(totals.invoiced, currency)} />
        <Tile label="Paid" value={fmt(paid, currency)} />
        <Tile label="Outstanding" value={fmt(totals.outstanding, currency)} accent={totals.outstanding > 0 ? "warn" : "ok"} />
      </section>
      </div>

      <PrintableReport
        title="Sales Report"
        subtitle={`${totals.count} invoices · Invoiced ${fmt(totals.invoiced, currency)} · Paid ${fmt(paid, currency)} · Outstanding ${fmt(totals.outstanding, currency)}`}
        company={company}
        period={formatPeriod(from, to)}
        landscape={false}
        showSignatures={false}
      >
      <div className="overflow-hidden rounded-xl border border-border bg-card print:rounded-none print:border-0">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Grand total</th>
              <th className="px-3 py-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No invoices in this range.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                <td className="px-3 py-2 tabular-nums text-foreground">{r.posting_date}</td>
                <td className="px-3 py-2">
                  <Link
                    href={(`/accounting/sales-invoices/${encodeURIComponent(r.name)}`) as Route}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-foreground">
                  {r.customer_name || r.customer}
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={r.status} docstatus={r.docstatus} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{fmt(r.grand_total, r.currency)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${r.outstanding_amount > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                  {fmt(r.outstanding_amount, r.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-border bg-muted/40 text-[12.5px]">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Total</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(totals.invoiced, currency)}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(totals.outstanding, currency)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </PrintableReport>
    </div>
  );
}

async function loadRows(company: string, from: string, to: string): Promise<Row[]> {
  const filters: Array<[string, string, unknown]> = [
    ["company", "=", company],
    ["posting_date", ">=", from],
    ["posting_date", "<=", to],
  ];
  const raw = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Colossal Sales Invoice",
      fields: [
        "name",
        "customer",
        "customer_name",
        "posting_date",
        "due_date",
        "company",
        "currency",
        "grand_total",
        "outstanding_amount",
        "status",
        "docstatus",
      ],
      filters,
      order_by: "posting_date desc, creation desc",
      limit_page_length: 500,
    },
  });
  return raw.map((r) => ({
    name: String(r.name ?? ""),
    customer: String(r.customer ?? ""),
    customer_name: String(r.customer_name ?? ""),
    posting_date: String(r.posting_date ?? ""),
    due_date: r.due_date ? String(r.due_date) : null,
    company: String(r.company ?? ""),
    currency: String(r.currency ?? "USD"),
    grand_total: Number(r.grand_total ?? 0),
    outstanding_amount: Number(r.outstanding_amount ?? 0),
    status: String(r.status ?? ""),
    docstatus: Number(r.docstatus ?? 0),
  }));
}

function Field({
  label, name, type, value, options,
}: {
  label: string; name: string; type: "date" | "select"; value: string; options?: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      {type === "select" ? (
        <select id={name} name={name} defaultValue={value} className="h-8 rounded-md border border-input bg-card px-2 text-[13px] focus-ring">
          {options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input id={name} name={name} type="date" defaultValue={value} className="h-8 rounded-md border border-input bg-card px-2 text-[13px] focus-ring" />
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: "ok" | "warn" }) {
  const tone =
    accent === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : accent === "ok"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-border bg-card text-foreground";
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-3 ${tone}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="text-lg font-bold tabular-nums leading-tight">{value}</span>
    </div>
  );
}

function StatusPill({ status, docstatus }: { status: string; docstatus: number }) {
  // Draft invoices use docstatus=0 regardless of what status the backend
  // may have left in the row. "Return" and "Credit Note Issued" are
  // post-submit flows worth their own tone.
  const label = docstatus === 2 ? "Cancelled" : (status || (docstatus === 0 ? "Draft" : "Submitted"));
  const tone =
    label === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : label === "Unpaid" || label === "Overdue" ? "bg-amber-50 text-amber-700 border-amber-200"
    : label === "Cancelled" || label === "Return" ? "bg-rose-50 text-rose-700 border-rose-200"
    : label === "Draft" ? "bg-slate-100 text-slate-700 border-slate-200"
    : "bg-sky-50 text-sky-700 border-sky-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function fmt(n: number, ccy: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${ccy} ${n.toFixed(2)}`;
  }
}
