import type { LeaveRow } from "@/lib/frappe/leaves";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { LeaveStatusBadge } from "./leave-status-badge";

export function LeavesTable({ rows }: { rows: LeaveRow[] }) {
  return (
    <DataTable<LeaveRow>
      rows={rows}
      rowKey={(r) => r.id}
      rowHref={(r) => `/hr/leaves/${encodeURIComponent(r.id)}`}
      empty="No leave applications match the current filters."
      columns={[
        {
          header: "Employee",
          cell: (r) => (
            <EmployeeCell id={r.employee} name={r.employeeName} />
          ),
        },
        {
          header: "Leave type",
          className: "hidden md:table-cell text-ash-800",
          cell: (r) => r.leaveType,
        },
        {
          header: "Dates",
          className: "text-ash-800",
          cell: (r) => fmtRange(r.fromDate, r.toDate),
        },
        {
          header: "Days",
          className: "hidden sm:table-cell text-ash-800",
          cell: (r) => r.totalDays.toFixed(r.totalDays % 1 === 0 ? 0 : 1),
        },
        {
          header: "Status",
          cell: (r) => <LeaveStatusBadge status={r.status} />,
        },
        {
          header: "Filed",
          className: "hidden xl:table-cell text-ash-600",
          cell: (r) => (r.postingDate ? fmtDate(r.postingDate) : "—"),
        },
      ]}
    />
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

function fmtRange(from: string, to: string) {
  if (from === to) return fmtDate(from);
  return `${fmtDate(from)} → ${fmtDate(to)}`;
}
