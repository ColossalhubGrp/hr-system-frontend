import Link from "next/link";
import type { Route } from "next";
import { Plane, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { SubTabs } from "@/components/common/sub-tabs";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { FilterRow } from "@/components/common/list-shell";
import { listTravelRequests } from "@/lib/frappe/finance-training";

export const metadata = { title: "Travel Requests · Colossal HR" };

type SP = { status?: string; employee?: string };

export default async function TravelPage({ searchParams }: { searchParams: SP }) {
  const rows = await listTravelRequests({
    status: searchParams.status || undefined,
    employee: searchParams.employee || undefined,
  });
  const counts = {
    draft: rows.filter((r) => r.status === "Draft").length,
    pending: rows.filter((r) => r.status === "Pending").length,
    approved: rows.filter((r) => r.status === "Approved").length,
    rejected: rows.filter((r) => r.status === "Rejected").length,
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Plane}
        crumb="HR · Travel"
        title="Travel requests"
        subtitle={`${rows.length.toLocaleString()} request${rows.length === 1 ? "" : "s"} in view.`}
        actions={
          <Link
            href={"/hr/travel/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New request
          </Link>
        }
      />

      <SubTabs
        tabs={[
          { id: "claims", label: "Claims" },
          { id: "advances", label: "Advances" },
          { id: "travel", label: "Travel" },
        ]}
        active="travel"
        hrefFor={(id) =>
          id === "claims"
            ? "/hr/expense-claims"
            : id === "advances"
              ? "/hr/employee-advances"
              : "/hr/travel"
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Draft" value={counts.draft} tone="amber" />
        <SummaryTile label="Pending" value={counts.pending} tone="amber" />
        <SummaryTile label="Approved" value={counts.approved} tone="rise" />
        <SummaryTile label="Rejected" value={counts.rejected} tone="fall" />
      </div>

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          {
            key: "status",
            label: "Status",
            options: ["Draft", "Pending", "Approved", "Rejected", "Cancelled"],
          },
        ]}
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/hr/travel/${encodeURIComponent(r.name)}`}
        empty="No travel requests match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell
                id={r.employee}
                name={r.employeeName}
                linkTo={`/hr/travel/${encodeURIComponent(r.name)}`}
              />
            ),
          },
          {
            header: "Type",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.travelType ?? "—",
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
            header: "Purpose",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => r.purposeOfTravel ?? "—",
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
