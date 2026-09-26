import Link from "next/link";
import type { Route } from "next";
import { Repeat, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listSubscriptionPlans, type SubscriptionPlan } from "@/lib/frappe/subscriptions/plan";

export const metadata = { title: "Subscription Plans · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function SubscriptionPlansPage() {
  const rows = await listSubscriptionPlans();
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
        crumb="Accounting · Subscriptions · Plans"
        title="Subscription Plans"
        subtitle={`${rows.length.toLocaleString()} priced plans. Subscriptions attach one or more plans.`}
        actions={
          <Link href={"/accounting/subscriptions/plans/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New plan
          </Link>
        }
      />
      <DataTable<SubscriptionPlan>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/subscriptions/plans/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No plans yet.</p>}
        columns={[
          { header: "Plan", cell: (r) => <Link href={`/accounting/subscriptions/plans/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.planName}</Link> },
          { header: "Item", cell: (r) => r.item ?? "—" },
          { header: "Cost", cell: (r) => `${r.currency} ${r.cost.toFixed(2)}`, className: "text-right tabular-nums" },
          { header: "Interval", cell: (r) => `${r.billingIntervalCount} ${r.billingInterval.toLowerCase()}${r.billingIntervalCount === 1 ? "" : "s"}` },
          { header: "Pricing", cell: (r) => r.priceDetermination },
        ]}
      />
    </div>
  );
}
