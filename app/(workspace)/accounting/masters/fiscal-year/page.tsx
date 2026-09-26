import Link from "next/link";
import type { Route } from "next";
import { CalendarClock, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { listFiscalYears, type FiscalYear } from "@/lib/frappe/masters/fiscal-year";

export const metadata = { title: "Fiscal Year · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function FiscalYearPage() {
  const rows = await listFiscalYears();

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
        crumb="Accounting · Masters · Fiscal Year"
        title="Fiscal Year"
        subtitle={`${rows.length.toLocaleString()} years — reports and opening balances key off these.`}
        actions={
          <Link
            href={"/accounting/masters/fiscal-year/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New year
          </Link>
        }
      />
      <DataTable<FiscalYear>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/fiscal-year/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No fiscal years yet.</p>
          </div>
        }
        columns={[
          { header: "Year", cell: (r) => <span className="font-semibold text-foreground">{r.name}</span> },
          { header: "Start", cell: (r) => r.yearStartDate },
          { header: "End", cell: (r) => r.yearEndDate },
          { header: "Status", cell: (r) => <StatusPill status={r.disabled ? "Disabled" : "Active"} /> },
          {
            header: "Auto",
            cell: (r) => (r.autoCreated ? "Auto-created" : "Manual"),
            className: "hidden md:table-cell text-muted-foreground",
          },
        ]}
      />
    </div>
  );
}
