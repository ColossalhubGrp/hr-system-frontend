import Link from "next/link";
import type { Route } from "next";
import { BarChart3, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listMonthlyDistributions, type MonthlyDistribution } from "@/lib/frappe/budgets/monthly-distribution";

export const metadata = { title: "Monthly Distributions · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function MonthlyDistributionPage() {
  const rows = await listMonthlyDistributions();
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
        crumb="Accounting · Masters · Monthly Distribution"
        title="Monthly Distributions"
        subtitle={`${rows.length.toLocaleString()} distributions — spread budgets or targets across months.`}
        actions={
          <Link href={"/accounting/masters/monthly-distribution/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New distribution
          </Link>
        }
      />
      <DataTable<MonthlyDistribution>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/monthly-distribution/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No distributions yet.</p>}
        columns={[
          { header: "Name", cell: (r) => <span className="font-semibold text-foreground">{r.distributionId}</span> },
          { header: "Fiscal year", cell: (r) => r.fiscalYear ?? "—" },
        ]}
      />
    </div>
  );
}
