import {
  PlayCircle,
  FileText,
  CheckCircle2,
  CircleSlash,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { FilterRow } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import {
  listPayrollEntries,
  PAYROLL_ENTRY_STATUSES,
} from "@/lib/frappe/payroll";

export const metadata = { title: "Payroll entries · Colossal Payroll" };

type SP = { status?: string; company?: string; page?: string };

export default async function PayrollEntriesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const result = await listPayrollEntries({
    status: searchParams.status || undefined,
    company: searchParams.company || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={PlayCircle}
        crumb="Payroll · Payroll Entries"
        title="Payroll entries"
        subtitle={`${result.total.toLocaleString()} payroll runs.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Total"
          value={result.total.toLocaleString()}
          icon={PlayCircle}
          tone="ink"
        />
        <SummaryTile
          label="Drafts"
          value={result.counts.draft}
          icon={FileText}
          tone="amber"
        />
        <SummaryTile
          label="Submitted"
          value={result.counts.submitted}
          icon={CheckCircle2}
          tone="rise"
        />
        <SummaryTile
          label="Cancelled"
          value={result.counts.cancelled}
          icon={CircleSlash}
          tone="ash"
        />
      </div>

      <FilterRow
        selects={[{ key: "status", label: "Status", options: PAYROLL_ENTRY_STATUSES }]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No payroll entries match the current filters."
        columns={[
          {
            header: "Run",
            className: "font-medium text-ash-900",
            cell: (r) => r.id,
          },
          {
            header: "Period",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) =>
              r.startDate && r.endDate
                ? `${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}`
                : "—",
          },
          {
            header: "Frequency",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => r.payrollFrequency ?? "—",
          },
          {
            header: "Company",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => r.company ?? "—",
          },
          { header: "Status", cell: (r) => <StatusPill status={r.status} /> },
        ]}
      />

      <DirectoryPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </div>
  );
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
