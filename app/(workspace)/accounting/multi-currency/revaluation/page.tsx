import Link from "next/link";
import type { Route } from "next";
import { RefreshCw, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listRevaluations, type Revaluation } from "@/lib/frappe/multi-currency/revaluation";

export const metadata = { title: "Exchange Rate Revaluation · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function RevaluationPage() {
  const rows = await listRevaluations();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={RefreshCw}
        crumb="Accounting · Multi-Currency · Revaluation"
        title="Exchange Rate Revaluation"
        subtitle={`${rows.length.toLocaleString()} revaluations recorded — period-end FX gain/loss on foreign-currency balances.`}
        actions={
          <Link href={"/accounting/multi-currency/revaluation/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New revaluation
          </Link>
        }
      />
      <DataTable<Revaluation>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/multi-currency/revaluation/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No revaluations yet.</p>}
        columns={[
          { header: "Doc", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "Company", cell: (r) => r.company },
          { header: "Posting date", cell: (r) => r.postingDate },
          { header: "Gain/loss account", cell: (r) => r.gainLossAccount },
          { header: "Net gain/loss", cell: (r) => r.totalGainLoss.toFixed(2), className: "text-right tabular-nums" },
          { header: "Status", cell: (r) => <StatusPill status={r.docstatus === 0 ? "Draft" : r.docstatus === 1 ? "Submitted" : "Cancelled"} /> },
        ]}
      />
    </div>
  );
}
