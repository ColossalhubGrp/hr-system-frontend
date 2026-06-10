import {
  Landmark,
  Banknote,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { FilterRow } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import { listLoans, LOAN_STATUSES } from "@/lib/frappe/loans";

export const metadata = { title: "Loans · Colossal Loans" };

type SP = { status?: string; applicant?: string; page?: string };

export default async function LoansPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const result = await listLoans({
    status: searchParams.status || undefined,
    applicant: searchParams.applicant || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Landmark}
        crumb="Loans · All loans"
        title="Loans"
        subtitle={`${result.total.toLocaleString()} loans on file.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Loans in view"
          value={result.total.toLocaleString()}
          icon={CircleDollarSign}
          tone="ink"
        />
        <SummaryTile
          label="Disbursed"
          value={formatMoney(result.totals.disbursed)}
          icon={Banknote}
          tone="rise"
        />
        <SummaryTile
          label="Repaid"
          value={formatMoney(result.totals.repaid)}
          icon={TrendingUp}
          tone="rise"
        />
        <SummaryTile
          label="Outstanding"
          value={formatMoney(result.totals.outstanding)}
          tone="amber"
        />
      </div>

      <FilterRow
        search={{ key: "applicant", placeholder: "Filter by applicant ID" }}
        selects={[{ key: "status", label: "Status", options: LOAN_STATUSES }]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No loans match the current filters."
        columns={[
          {
            header: "Applicant",
            cell: (r) => (
              <EmployeeCell id={r.applicant} name={r.applicantName} />
            ),
          },
          {
            header: "Loan type",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.loanType ?? "—",
          },
          {
            header: "Loan",
            className: "text-right text-ash-800",
            cell: (r) => formatMoney(r.loanAmount),
          },
          {
            header: "Payable",
            className: "text-right hidden sm:table-cell text-ash-700",
            cell: (r) => formatMoney(r.totalPayable),
          },
          {
            header: "Paid",
            className: "text-right font-semibold text-ink-900",
            cell: (r) => formatMoney(r.totalPaid),
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

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
