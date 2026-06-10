import { FileSpreadsheet, CheckCircle2, CircleSlash } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { FilterRow } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import { listSalaryStructures } from "@/lib/frappe/payroll";

export const metadata = { title: "Salary structures · Colossal Payroll" };

type SP = { active?: string; company?: string; page?: string };

export default async function SalaryStructuresPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const result = await listSalaryStructures({
    active: searchParams.active || undefined,
    company: searchParams.company || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={FileSpreadsheet}
        crumb="Payroll · Salary Structures"
        title="Salary structures"
        subtitle={`${result.total.toLocaleString()} structures defined.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Total"
          value={result.total.toLocaleString()}
          icon={FileSpreadsheet}
          tone="ink"
        />
        <SummaryTile
          label="Active"
          value={result.counts.active}
          icon={CheckCircle2}
          tone="rise"
        />
        <SummaryTile
          label="Inactive"
          value={result.counts.inactive}
          icon={CircleSlash}
          tone="ash"
        />
      </div>

      <FilterRow
        selects={[
          { key: "active", label: "Active", options: ["Yes", "No"] },
        ]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No salary structures match the current filters."
        columns={[
          {
            header: "Structure",
            className: "font-medium text-ash-900",
            cell: (r) => r.name,
          },
          {
            header: "Company",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.company ?? "—",
          },
          {
            header: "Frequency",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => r.payrollFrequency ?? "—",
          },
          {
            header: "Currency",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => r.currency ?? "—",
          },
          {
            header: "Status",
            cell: (r) => (
              <StatusPill status={r.isActive ? "Active" : "Inactive"} />
            ),
          },
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
