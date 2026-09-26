import Link from "next/link";
import type { Route } from "next";
import { Calculator, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listBudgets, type BudgetRow } from "@/lib/frappe/budgets/budget";

export const metadata = { title: "Budgets · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const rows = await listBudgets();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={Calculator}
        crumb="Accounting · Budgets"
        title="Budgets"
        subtitle={`${rows.length.toLocaleString()} budgets — cap spending per Cost Center, Project or Accounting Dimension.`}
        actions={
          <Link href={"/accounting/budgets/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New budget
          </Link>
        }
      />
      <DataTable<BudgetRow>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/budgets/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No budgets yet.</p>}
        columns={[
          { header: "Budget", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "Against", cell: (r) => `${r.budgetAgainst}: ${r.costCenter ?? r.project ?? "—"}` },
          { header: "Company", cell: (r) => r.company },
          { header: "Fiscal year", cell: (r) => r.fiscalYear },
          { header: "Monthly split", cell: (r) => r.monthlyDistribution ?? "—" },
          { header: "Status", cell: (r) => <StatusPill status={r.docstatus === 0 ? "Draft" : r.docstatus === 1 ? "Submitted" : "Cancelled"} /> },
        ]}
      />
    </div>
  );
}
