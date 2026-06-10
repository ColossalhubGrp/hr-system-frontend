import {
  FileSignature,
  ClipboardList,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { FilterRow } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import {
  listLoanApplications,
  LOAN_APPLICATION_STATUSES,
} from "@/lib/frappe/loans";

export const metadata = { title: "Loan applications · Colossal Loans" };

type SP = { status?: string; applicant?: string; page?: string };

export default async function LoanApplicationsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const result = await listLoanApplications({
    status: searchParams.status || undefined,
    applicant: searchParams.applicant || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={FileSignature}
        crumb="Loans · Applications"
        title="Loan applications"
        subtitle={`${result.total.toLocaleString()} applications in view.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Total"
          value={result.total.toLocaleString()}
          icon={ClipboardList}
          tone="ink"
        />
        <SummaryTile
          label="Open"
          value={result.counts.open}
          icon={ClipboardList}
          tone="amber"
        />
        <SummaryTile
          label="Approved"
          value={result.counts.approved}
          icon={CheckCircle2}
          tone="rise"
        />
        <SummaryTile
          label="Rejected"
          value={result.counts.rejected}
          icon={XCircle}
          tone="fall"
        />
      </div>

      <FilterRow
        search={{ key: "applicant", placeholder: "Filter by applicant ID" }}
        selects={[
          { key: "status", label: "Status", options: LOAN_APPLICATION_STATUSES },
        ]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No loan applications match the current filters."
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
            header: "Amount",
            className: "text-right font-medium text-ink-900",
            cell: (r) => formatMoney(r.loanAmount),
          },
          {
            header: "Filed",
            className: "hidden lg:table-cell text-ash-700",
            cell: (r) => (r.postingDate ? fmtDate(r.postingDate) : "—"),
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

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
