import Link from "next/link";
import type { Route } from "next";
import { Mail, Phone } from "lucide-react";
import type { EmployeeListRow } from "@/lib/frappe/employees";
import { DataTable } from "@/components/common/data-table";
import { EmployeeAvatar } from "./avatar";
import { StatusBadge } from "./status-badge";

export function DirectoryTable({ rows }: { rows: EmployeeListRow[] }) {
  return (
    <DataTable<EmployeeListRow>
      rows={rows}
      rowKey={(r) => r.id}
      rowHref={(r) => `/employee/${encodeURIComponent(r.id)}`}
      rowAriaLabel={(r) => `Open ${r.name}`}
      empty="No employees match the current filters."
      columns={[
        {
          header: "Employee",
          cell: (r) => (
            <Link
              href={
                `/employee/${encodeURIComponent(r.id)}` as Route
              }
              className="flex items-center gap-3 focus-ring rounded-xl"
            >
              <EmployeeAvatar name={r.name} imageUrl={r.imageUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium text-ash-900">{r.name}</p>
                <p className="truncate text-xs text-ash-500">{r.id}</p>
              </div>
            </Link>
          ),
        },
        {
          header: "Contact",
          className: "hidden lg:table-cell",
          cell: (r) => (
            <div className="flex flex-col gap-1 text-xs text-ash-600">
              {r.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-ash-400" />
                  <span className="truncate">{r.email}</span>
                </span>
              )}
              {r.mobile && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-ash-400" />
                  <span className="truncate">{r.mobile}</span>
                </span>
              )}
            </div>
          ),
        },
        {
          header: "Designation",
          className: "hidden md:table-cell text-ash-800",
          cell: (r) => r.designation ?? "—",
        },
        {
          header: "Department",
          className: "hidden md:table-cell text-ash-800",
          cell: (r) => r.department ?? "—",
        },
        {
          header: "Status",
          cell: (r) => <StatusBadge status={r.status} />,
        },
        {
          header: "Joined",
          className: "hidden xl:table-cell text-ash-700",
          cell: (r) => (r.dateOfJoining ? formatDate(r.dateOfJoining) : "—"),
        },
      ]}
    />
  );
}

function formatDate(iso: string) {
  // Frappe gives `YYYY-MM-DD` for date fields; treat it as wall-clock to avoid
  // off-by-one when the server timezone differs.
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
