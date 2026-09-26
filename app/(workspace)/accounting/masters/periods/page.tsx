import Link from "next/link";
import type { Route } from "next";
import { CalendarClock, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listAccountingPeriods, type AccountingPeriod } from "@/lib/frappe/masters/accounting-period";

export const metadata = { title: "Accounting Periods · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function AccountingPeriodsPage() {
  const rows = await listAccountingPeriods();

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
        crumb="Accounting · Masters · Accounting Periods"
        title="Accounting Periods"
        subtitle={`${rows.length.toLocaleString()} closed / locked periods.`}
        actions={
          <Link href={"/accounting/masters/periods/new" as Route} className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring">
            <Plus className="h-4 w-4" />
            New period
          </Link>
        }
      />
      <DataTable<AccountingPeriod>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/periods/${encodeURIComponent(r.name)}`}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No periods yet.</p>}
        columns={[
          { header: "Period", cell: (r) => <Link href={`/accounting/masters/periods/${encodeURIComponent(r.name)}` as Route} className="font-semibold text-foreground hover:underline">{r.periodName}</Link> },
          { header: "Company", cell: (r) => r.company },
          { header: "Start", cell: (r) => r.startDate },
          { header: "End", cell: (r) => r.endDate },
        ]}
      />
    </div>
  );
}
