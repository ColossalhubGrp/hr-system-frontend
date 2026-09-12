import Link from "next/link";
import type { Route } from "next";
import { DoorOpen, Plus, Clock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { SubTabs } from "@/components/common/sub-tabs";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { FilterRow } from "@/components/common/list-shell";
import { PERFORMANCE_TABS, performanceHrefFor } from "@/components/performance/nav-tabs";
import { listExitInterviews } from "@/lib/frappe/lifecycle-ext";

export const metadata = { title: "Exit Interviews · Colossal HR" };

type SP = { status?: string; employee?: string };

export default async function ExitInterviewsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const rows = await listExitInterviews({
    status: searchParams.status || undefined,
    employee: searchParams.employee || undefined,
  });
  const counts = {
    pending: rows.filter((r) => r.status === "Pending").length,
    scheduled: rows.filter((r) => r.status === "Scheduled").length,
    completed: rows.filter((r) => r.status === "Completed").length,
    retained: rows.filter((r) => r.employeeStatus === "Employee Retained").length,
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={DoorOpen}
        crumb="HR · Exit Interviews"
        title="Exit interviews"
        subtitle={`${rows.length.toLocaleString()} interview${rows.length === 1 ? "" : "s"} on file.`}
        actions={
          <Link
            href={"/hr/exit-interviews/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            Schedule interview
          </Link>
        }
      />

      <SubTabs
        tabs={PERFORMANCE_TABS}
        active="exit-interviews"
        hrefFor={performanceHrefFor}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Pending" value={counts.pending} icon={Clock} tone="amber" />
        <SummaryTile label="Scheduled" value={counts.scheduled} tone="ink" />
        <SummaryTile
          label="Completed"
          value={counts.completed}
          icon={CheckCircle2}
          tone="rise"
        />
        <SummaryTile
          label="Retained"
          value={counts.retained}
          hint="Employee stayed after"
          tone="rise"
        />
      </div>

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          {
            key: "status",
            label: "Status",
            options: ["Pending", "Scheduled", "Completed"],
          },
        ]}
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/hr/exit-interviews/${encodeURIComponent(r.name)}`}
        empty="No exit interviews match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell
                id={r.employee}
                name={r.employeeName}
                linkTo={`/hr/exit-interviews/${encodeURIComponent(r.name)}`}
              />
            ),
          },
          {
            header: "Department",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.department ?? "—",
          },
          {
            header: "Relieving",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => (r.relievingDate ? fmtDate(r.relievingDate) : "—"),
          },
          {
            header: "Interview",
            className: "text-ash-700",
            cell: (r) => (r.interviewDate ? fmtDate(r.interviewDate) : "—"),
          },
          { header: "Status", cell: (r) => <StatusPill status={r.status} /> },
          {
            header: "Outcome",
            className: "text-ash-700",
            cell: (r) => r.employeeStatus ?? "—",
          },
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
