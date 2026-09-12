import Link from "next/link";
import type { Route } from "next";
import { Clock3, Plus, FileText, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { FilterRow } from "@/components/common/list-shell";
import { listOvertimeSlips } from "@/lib/frappe/lifecycle-ext";

export const metadata = { title: "Overtime Slips · Colossal HR" };

type SP = { status?: string; employee?: string };

export default async function OvertimeSlipsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const rows = await listOvertimeSlips({
    status: searchParams.status || undefined,
    employee: searchParams.employee || undefined,
  });
  const counts = {
    draft: rows.filter((r) => r.status === "Draft").length,
    approved: rows.filter((r) => r.status === "Approved" || r.status === "Submitted").length,
    hours: rows.filter((r) => r.docstatus === 1).reduce((a, r) => a + r.totalOvertimeHours, 0),
    amount: rows.filter((r) => r.docstatus === 1).reduce((a, r) => a + r.totalOvertimeAmount, 0),
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Clock3}
        crumb="HR · Overtime Slips"
        title="Overtime slips"
        subtitle={`${rows.length.toLocaleString()} slip${rows.length === 1 ? "" : "s"} in view.`}
        actions={
          <Link
            href={"/hr/overtime-slips/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New slip
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Draft" value={counts.draft} icon={FileText} tone="amber" />
        <SummaryTile label="Approved" value={counts.approved} icon={CheckCircle2} tone="rise" />
        <SummaryTile
          label="Total OT hours"
          value={counts.hours.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          })}
          tone="ink"
        />
        <SummaryTile
          label="Total OT amount"
          value={counts.amount.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
          tone="ink"
        />
      </div>

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          {
            key: "status",
            label: "Status",
            options: ["Draft", "Approved", "Submitted", "Rejected", "Cancelled"],
          },
        ]}
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/hr/overtime-slips/${encodeURIComponent(r.name)}`}
        empty="No overtime slips match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell
                id={r.employee}
                name={r.employeeName}
                linkTo={`/hr/overtime-slips/${encodeURIComponent(r.name)}`}
              />
            ),
          },
          {
            header: "From",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => (r.fromDate ? fmtDate(r.fromDate) : "—"),
          },
          {
            header: "To",
            className: "text-ash-700",
            cell: (r) => (r.toDate ? fmtDate(r.toDate) : "—"),
          },
          {
            header: "Hours",
            className: "text-right text-ash-800",
            cell: (r) => r.totalOvertimeHours.toFixed(1),
          },
          {
            header: "Amount",
            className: "hidden sm:table-cell text-right text-ash-800",
            cell: (r) =>
              r.totalOvertimeAmount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }),
          },
          { header: "Status", cell: (r) => <StatusPill status={r.status} /> },
        ]}
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
