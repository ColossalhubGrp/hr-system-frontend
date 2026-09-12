import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FilterRow } from "@/components/common/list-shell";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { SummaryTile } from "@/components/common/summary-tile";
import { listAppraisalOverview } from "@/lib/frappe/finance-training";
import {
  listAppraisalCyclesNames,
  listCompanies,
  listDepartmentNames,
} from "@/lib/frappe/lookups";

export const metadata = { title: "Appraisal overview · Colossal HR" };

type SP = {
  cycle?: string;
  company?: string;
  department?: string;
  from?: string;
  to?: string;
};

export default async function AppraisalOverviewPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const [rows, cycles, companies, departments] = await Promise.all([
    listAppraisalOverview({
      cycle: searchParams.cycle,
      company: searchParams.company,
      department: searchParams.department,
      fromDate: searchParams.from,
      toDate: searchParams.to,
    }),
    listAppraisalCyclesNames(),
    listCompanies(),
    listDepartmentNames(),
  ]);

  const totals = {
    people: rows.length,
    avgFinal:
      rows.reduce((a, r) => a + r.finalScore, 0) / Math.max(1, rows.length),
    avgFeedback:
      rows.reduce((a, r) => a + r.feedbackCount, 0) / Math.max(1, rows.length),
    highPerformers: rows.filter((r) => r.rating >= 4).length,
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to performance
      </Link>
      <PageHeader
        icon={BarChart3}
        crumb="HR · Performance · Overview"
        title="Appraisal overview"
        subtitle="Every appraisal on file, ranked by final score. Self, average feedback, and goal contributions all in one row."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Appraisals" value={totals.people} />
        <SummaryTile
          label="Avg final"
          value={totals.avgFinal.toFixed(2)}
          tone="ink"
        />
        <SummaryTile
          label="Avg feedback count"
          value={totals.avgFeedback.toFixed(1)}
        />
        <SummaryTile
          label="High performers"
          value={totals.highPerformers}
          hint="Rating ≥ 4"
          tone="rise"
        />
      </div>

      <FilterRow
        selects={[
          { key: "cycle", label: "Cycle", options: cycles },
          { key: "company", label: "Company", options: companies },
          { key: "department", label: "Department", options: departments },
        ]}
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        empty="No appraisals match these filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell id={r.employee} name={r.employeeName} />
            ),
          },
          {
            header: "Cycle",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.cycle ?? "—",
          },
          {
            header: "Department",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => r.department ?? "—",
          },
          {
            header: "Self",
            className: "text-right text-ash-800",
            cell: (r) => r.selfScore.toFixed(2),
          },
          {
            header: "Feedback",
            className: "text-right text-ash-800",
            cell: (r) => `${r.avgFeedbackScore.toFixed(2)} (${r.feedbackCount})`,
          },
          {
            header: "Goals",
            className: "text-right text-ash-800",
            cell: (r) => r.goalScore.toFixed(2),
          },
          {
            header: "Final",
            className: "text-right font-semibold text-ink-900",
            cell: (r) => r.finalScore.toFixed(2),
          },
          {
            header: "Rating",
            className: "text-right",
            cell: (r) => (r.rating ? `★ ${r.rating.toFixed(1)}` : "—"),
          },
        ]}
      />
    </div>
  );
}
