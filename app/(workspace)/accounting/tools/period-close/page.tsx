import Link from "next/link";
import type { Route } from "next";
import { CalendarClock, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listPeriodClosings, type PeriodClosingVoucher } from "@/lib/frappe/tools/period-closing-voucher";

export const metadata = { title: "Period Closing · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function PeriodClosePage() {
  const rows = await listPeriodClosings();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={CalendarClock}
        crumb="Accounting · Tools · Period Closing Voucher"
        title="Period Closing Voucher"
        subtitle={`${rows.length.toLocaleString()} vouchers — year-end close that moves P&L into a closing account.`}
        actions={
          <Link href={"/accounting/tools/period-close/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New voucher
          </Link>
        }
      />
      <DataTable<PeriodClosingVoucher>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/tools/period-close/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No period closings yet.</p>}
        columns={[
          { header: "Voucher", cell: (r) => <span className="font-mono text-sm">{r.name}</span> },
          { header: "Company", cell: (r) => r.company },
          { header: "Fiscal year", cell: (r) => r.fiscalYear },
          { header: "Posting date", cell: (r) => r.postingDate },
          { header: "Closing account", cell: (r) => r.closingAccountHead },
          { header: "Status", cell: (r) => <StatusPill status={r.docstatus === 0 ? "Draft" : r.docstatus === 1 ? "Submitted" : "Cancelled"} /> },
        ]}
      />
    </div>
  );
}
