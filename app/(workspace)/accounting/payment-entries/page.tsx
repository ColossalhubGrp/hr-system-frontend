import Link from "next/link";
import type { Route } from "next";
import {
  Wallet,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import {
  listPaymentEntries,
  PAYMENT_TYPES,
  type PaymentEntryRow,
} from "@/lib/frappe/accounting";

export const metadata = { title: "Payment Entries · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { status?: string; type?: string; page?: string };

type StatusFilter = "all" | "draft" | "submitted" | "cancelled";

function docstatusForFilter(f: StatusFilter): number | undefined {
  return f === "draft" ? 0 : f === "submitted" ? 1 : f === "cancelled" ? 2 : undefined;
}

export default async function PaymentEntriesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const status = (searchParams.status as StatusFilter) || "all";
  const paymentType = searchParams.type || undefined;
  const page = Number(searchParams.page ?? 1) || 1;

  const result = await listPaymentEntries({
    docstatus: docstatusForFilter(status),
    paymentType,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Wallet}
        crumb="Accounting · Payment Entries"
        title="Payment Entries"
        subtitle={`${result.total.toLocaleString()} payments in view.`}
        actions={
          <Link
            href={"/accounting/payment-entries/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New payment
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryTile label="Draft" value={result.counts.draft} hint="Not yet posted" icon={FileText} tone="amber" />
        <SummaryTile label="Submitted" value={result.counts.submitted} hint="Posted to the ledger" icon={CheckCircle2} tone="rise" />
        <SummaryTile label="Cancelled" value={result.counts.cancelled} hint="Reversed after submit" icon={XCircle} tone="fall" />
        <SummaryTile label="Total received" value={formatMoney(result.counts.receivedTotal)} hint="Submitted 'Receive' entries" icon={ArrowDownToLine} tone="rise" />
        <SummaryTile label="Total paid" value={formatMoney(result.counts.paidTotal)} hint="Submitted 'Pay' entries" icon={ArrowUpFromLine} tone="fall" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusFilterPills active={status} paymentType={paymentType} />
        <PaymentTypeFilter active={paymentType} status={status} />
      </div>

      <DataTable<PaymentEntryRow>
        rows={result.rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/payment-entries/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No payment entries match this view.</p>
          </div>
        }
        columns={[
          { header: "Voucher", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "Type", cell: (r) => <PaymentTypePill type={r.paymentType} /> },
          { header: "Date", cell: (r) => r.postingDate },
          {
            header: "Party",
            cell: (r) => (r.partyName ?? r.party ?? "—"),
            className: "hidden md:table-cell",
          },
          {
            header: "Mode",
            cell: (r) => r.modeOfPayment ?? "—",
            className: "hidden lg:table-cell",
          },
          {
            header: "Amount",
            cell: (r) =>
              r.paymentType === "Receive"
                ? formatMoney(r.receivedAmount)
                : formatMoney(r.paidAmount),
            className: "text-right tabular-nums",
          },
          { header: "Status", cell: (r) => <StatusPill status={docstatusLabel(r.docstatus)} /> },
        ]}
      />

      {result.total > result.pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {result.page} of {Math.max(1, Math.ceil(result.total / result.pageSize))}
          </span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`/accounting/payment-entries?${paramsWith({ ...searchParams, page: String(result.page - 1) })}` as Route}
                className="rounded-chip border border-input px-3 py-1 hover:bg-muted/40"
              >
                Previous
              </Link>
            )}
            {result.page * result.pageSize < result.total && (
              <Link
                href={`/accounting/payment-entries?${paramsWith({ ...searchParams, page: String(result.page + 1) })}` as Route}
                className="rounded-chip border border-input px-3 py-1 hover:bg-muted/40"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentTypePill({ type }: { type: string }) {
  const tone =
    type === "Receive"
      ? "bg-rise/10 text-rise"
      : type === "Pay"
      ? "bg-fall/10 text-fall"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-chip px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {type}
    </span>
  );
}

function StatusFilterPills({
  active,
  paymentType,
}: {
  active: StatusFilter;
  paymentType: string | undefined;
}) {
  const options: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "submitted", label: "Submitted" },
    { id: "cancelled", label: "Cancelled" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-chip border border-border/60 bg-muted/20 p-0.5">
      {options.map((o) => {
        const params = paramsWith({
          status: o.id === "all" ? undefined : o.id,
          type: paymentType,
        });
        const isActive = active === o.id;
        return (
          <Link
            key={o.id}
            href={`/accounting/payment-entries?${params}` as Route}
            className={`rounded-chip px-3 py-1 text-xs font-semibold transition ${
              isActive ? "bg-ink-800 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function PaymentTypeFilter({
  active,
  status,
}: {
  active: string | undefined;
  status: StatusFilter;
}) {
  return (
    <form className="flex items-center gap-2" action="/accounting/payment-entries">
      {status !== "all" && <input type="hidden" name="status" value={status} />}
      <label htmlFor="type" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Type
      </label>
      <select
        id="type"
        name="type"
        defaultValue={active ?? ""}
        className="h-8 rounded-chip border border-input bg-transparent px-2 text-sm focus-ring"
      >
        <option value="">All types</option>
        {PAYMENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-chip border border-input px-3 py-1 text-xs font-semibold hover:bg-muted/40">
        Filter
      </button>
    </form>
  );
}

function paramsWith(patch: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(patch)) if (v) p.set(k, v);
  return p.toString();
}

function docstatusLabel(d: 0 | 1 | 2): string {
  return d === 0 ? "Draft" : d === 1 ? "Submitted" : "Cancelled";
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
