import Link from "next/link";
import { SectionBack } from "../../_lib/section-back";
import type { Route } from "next";
import { ArrowRightLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listShareTransfers, type ShareTransfer } from "@/lib/frappe/shares/share-transfer";

export const metadata = { title: "Share Transfers · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function ShareTransfersPage() {
  const rows = await listShareTransfers();
  return (
    <div className="flex flex-col gap-5">
      <SectionBack path="/accounting/shares/transfers" />
      <PageHeader
        icon={ArrowRightLeft}
        crumb="Accounting · Shares · Transfers"
        title="Share Transfers"
        subtitle={`${rows.length.toLocaleString()} transfers.`}
        actions={
          <Link href={"/accounting/shares/transfers/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New transfer
          </Link>
        }
      />
      <DataTable<ShareTransfer>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/shares/transfers/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No transfers yet.</p>}
        columns={[
          { header: "Voucher", cell: (r) => <Link href={`/accounting/shares/transfers/${encodeURIComponent(r.name)}` as Route} className="font-mono text-sm font-semibold text-foreground hover:underline">{r.name}</Link> },
          { header: "Type", cell: (r) => r.transferType },
          { header: "Date", cell: (r) => r.date },
          { header: "From → To", cell: (r) => `${r.fromShareholder ?? "—"} → ${r.toShareholder ?? "—"}` },
          { header: "Shares", cell: (r) => r.noOfShares.toLocaleString(), className: "text-right tabular-nums" },
          { header: "Amount", cell: (r) => r.amount.toFixed(2), className: "text-right tabular-nums" },
          { header: "Status", cell: (r) => <StatusPill status={r.docstatus === 0 ? "Draft" : r.docstatus === 1 ? "Submitted" : "Cancelled"} /> },
        ]}
      />
    </div>
  );
}
