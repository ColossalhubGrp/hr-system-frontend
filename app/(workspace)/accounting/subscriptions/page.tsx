import Link from "next/link";
import type { Route } from "next";
import { Repeat, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listSubscriptions, type SubscriptionRow } from "@/lib/frappe/subscriptions/subscription";

export const metadata = { title: "Subscriptions · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const rows = await listSubscriptions();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={Repeat}
        crumb="Accounting · Subscriptions"
        title="Subscriptions"
        subtitle={`${rows.length.toLocaleString()} active/past subscriptions.`}
        actions={
          <Link href={"/accounting/subscriptions/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New subscription
          </Link>
        }
      />
      <DataTable<SubscriptionRow>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/subscriptions/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No subscriptions yet.</p>}
        columns={[
          { header: "Sub", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "Party", cell: (r) => `${r.partyType}: ${r.party}` },
          { header: "Company", cell: (r) => r.company },
          { header: "Started", cell: (r) => r.startDate },
          { header: "Current period", cell: (r) => r.currentInvoiceStart ? `${r.currentInvoiceStart} → ${r.currentInvoiceEnd ?? "?"}` : "—" },
          { header: "Status", cell: (r) => <StatusPill status={r.status || "—"} /> },
        ]}
      />
    </div>
  );
}
