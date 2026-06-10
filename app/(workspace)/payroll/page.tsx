import { Wallet, Banknote, Receipt, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { FilterRow } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import {
  listSalarySlips,
  SALARY_SLIP_STATUSES,
} from "@/lib/frappe/payroll";

export const metadata = { title: "Salary slips · Colossal Payroll" };

type SP = { status?: string; employee?: string; page?: string };

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const result = await listSalarySlips({
    status: searchParams.status || undefined,
    employee: searchParams.employee || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Wallet}
        crumb="Payroll · Salary Slips"
        title="Salary slips"
        subtitle={`${result.total.toLocaleString()} slips on file.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Slips in view"
          value={result.total.toLocaleString()}
          icon={Receipt}
          tone="ink"
        />
        <SummaryTile
          label="Gross"
          value={formatMoney(result.totals.gross)}
          tone="amber"
        />
        <SummaryTile
          label="Deductions"
          value={formatMoney(result.totals.deductions)}
          icon={TrendingDown}
          tone="fall"
        />
        <SummaryTile
          label="Net pay"
          value={formatMoney(result.totals.net)}
          icon={Banknote}
          tone="rise"
        />
      </div>

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[{ key: "status", label: "Status", options: SALARY_SLIP_STATUSES }]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No salary slips match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell id={r.employee} name={r.employeeName} />
            ),
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
            header: "Gross",
            className: "text-right text-ash-800",
            cell: (r) => formatMoney(r.grossPay),
          },
          {
            header: "Deductions",
            className: "text-right hidden sm:table-cell text-fall",
            cell: (r) =>
              r.totalDeduction > 0 ? `−${formatMoney(r.totalDeduction)}` : "—",
          },
          {
            header: "Net",
            className: "text-right font-semibold text-ink-900",
            cell: (r) => formatMoney(r.netPay),
          },
          {
            header: "Status",
            cell: (r) => <StatusPill status={r.status} />,
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

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
