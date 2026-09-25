import Link from "next/link";
import type { Route } from "next";
import { BookOpen, Plus, FileText, CheckCircle2, XCircle, Coins } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { listJournalEntries, VOUCHER_TYPES, type JournalEntryRow } from "@/lib/frappe/accounting";

export const metadata = { title: "Journal Entries · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

type SP = { status?: string; voucher?: string; page?: string };

type StatusFilter = "all" | "draft" | "submitted" | "cancelled";

function docstatusForFilter(f: StatusFilter): number | undefined {
  return f === "draft" ? 0 : f === "submitted" ? 1 : f === "cancelled" ? 2 : undefined;
}

export default async function JournalEntriesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const status = (searchParams.status as StatusFilter) || "all";
  const voucherType = searchParams.voucher || undefined;
  const page = Number(searchParams.page ?? 1) || 1;

  const result = await listJournalEntries({
    docstatus: docstatusForFilter(status),
    voucherType,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={BookOpen}
        crumb="Accounting · Journal Entries"
        title="Journal Entries"
        subtitle={`${result.total.toLocaleString()} vouchers in view.`}
        actions={
          <Link
            href={"/accounting/journal-entries/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New entry
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Draft"
          value={result.counts.draft}
          hint="Not yet posted"
          icon={FileText}
          tone="amber"
        />
        <SummaryTile
          label="Submitted"
          value={result.counts.submitted}
          hint="Posted to the ledger"
          icon={CheckCircle2}
          tone="rise"
        />
        <SummaryTile
          label="Cancelled"
          value={result.counts.cancelled}
          hint="Reversed after submit"
          icon={XCircle}
          tone="fall"
        />
        <SummaryTile
          label="Total posted"
          value={formatMoney(result.counts.postedTotal)}
          hint="Sum of submitted debits"
          icon={Coins}
          tone="ink"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusFilterPills active={status} voucherType={voucherType} />
        <VoucherTypeFilter active={voucherType} status={status} />
      </div>

      <DataTable<JournalEntryRow>
        rows={result.rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/journal-entries/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No journal entries match this view.</p>
          </div>
        }
        columns={[
          { header: "Voucher", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "Type", cell: (r) => r.voucherType, className: "hidden md:table-cell" },
          { header: "Date", cell: (r) => r.postingDate },
          { header: "Company", cell: (r) => r.company, className: "hidden lg:table-cell" },
          { header: "Debit", cell: (r) => formatMoney(r.totalDebit), className: "text-right tabular-nums" },
          { header: "Credit", cell: (r) => formatMoney(r.totalCredit), className: "text-right tabular-nums" },
          { header: "Status", cell: (r) => <StatusPill status={docstatusLabel(r.docstatus)} /> },
        ]}
      />

      {result.total > result.pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {result.page} of{" "}
            {Math.max(1, Math.ceil(result.total / result.pageSize))}
          </span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={
                  `/accounting/journal-entries?${paramsWith({ ...searchParams, page: String(result.page - 1) })}` as Route
                }
                className="rounded-chip border border-input px-3 py-1 hover:bg-muted/40"
              >
                Previous
              </Link>
            )}
            {result.page * result.pageSize < result.total && (
              <Link
                href={
                  `/accounting/journal-entries?${paramsWith({ ...searchParams, page: String(result.page + 1) })}` as Route
                }
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

function StatusFilterPills({
  active,
  voucherType,
}: {
  active: StatusFilter;
  voucherType: string | undefined;
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
          voucher: voucherType,
        });
        const isActive = active === o.id;
        return (
          <Link
            key={o.id}
            href={`/accounting/journal-entries?${params}` as Route}
            className={`rounded-chip px-3 py-1 text-xs font-semibold transition ${
              isActive
                ? "bg-ink-800 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function VoucherTypeFilter({
  active,
  status,
}: {
  active: string | undefined;
  status: StatusFilter;
}) {
  return (
    <form className="flex items-center gap-2" action="/accounting/journal-entries">
      {status !== "all" && <input type="hidden" name="status" value={status} />}
      <label htmlFor="voucher" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Type
      </label>
      <select
        id="voucher"
        name="voucher"
        defaultValue={active ?? ""}
        className="h-8 rounded-chip border border-input bg-transparent px-2 text-sm focus-ring"
      >
        <option value="">All types</option>
        {VOUCHER_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-chip border border-input px-3 py-1 text-xs font-semibold hover:bg-muted/40"
      >
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
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
