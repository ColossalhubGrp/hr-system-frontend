import Link from "next/link";
import type { Route } from "next";
import { PieChart, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listCostCenterAllocations, type CostCenterAllocation } from "@/lib/frappe/budgets/cost-center-allocation";

export const metadata = { title: "Cost Center Allocations · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function CostCenterAllocationsPage() {
  const rows = await listCostCenterAllocations();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/cost-centers" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Cost Centers
        </Link>
      </div>
      <PageHeader
        icon={PieChart}
        crumb="Accounting · Cost Centers · Allocations"
        title="Cost Center Allocations"
        subtitle={`${rows.length.toLocaleString()} allocations — split a main cost centre into sub-centres by percentage.`}
        actions={
          <Link href={"/accounting/cost-centers/allocations/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New allocation
          </Link>
        }
      />
      <DataTable<CostCenterAllocation>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/cost-centers/allocations/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No allocations yet.</p>}
        columns={[
          { header: "Allocation", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "Company", cell: (r) => r.company },
          { header: "Main cost centre", cell: (r) => r.mainCostCenter },
          { header: "Valid from", cell: (r) => r.validFrom },
          { header: "Status", cell: (r) => <StatusPill status={r.docstatus === 0 ? "Draft" : r.docstatus === 1 ? "Submitted" : "Cancelled"} /> },
        ]}
      />
    </div>
  );
}
