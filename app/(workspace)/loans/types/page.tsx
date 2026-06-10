import { Tags } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FilterRow } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { DirectoryPagination } from "@/components/employee/directory-pagination";
import { listLoanTypes } from "@/lib/frappe/loans";

export const metadata = { title: "Loan types · Colossal Loans" };

type SP = { enabled?: string; page?: string };

export default async function LoanTypesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const result = await listLoanTypes({
    enabled: searchParams.enabled || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Tags}
        crumb="Loans · Loan Types"
        title="Loan types"
        subtitle={`${result.total.toLocaleString()} configured.`}
      />

      <FilterRow
        selects={[
          { key: "enabled", label: "Enabled", options: ["Yes", "No"] },
        ]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        empty="No loan types match the current filters."
        columns={[
          {
            header: "Loan type",
            cell: (r) => (
              <>
                <p className="font-medium text-ash-900">{r.name}</p>
                {r.description && (
                  <p className="text-xs text-ash-500">{r.description}</p>
                )}
              </>
            ),
          },
          {
            header: "Kind",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => (r.isTermLoan ? "Term" : "Demand"),
          },
          {
            header: "Max amount",
            className: "text-right text-ash-800",
            cell: (r) => formatMoney(r.maxLoanAmount),
          },
          {
            header: "Interest %",
            className: "text-right text-ash-800",
            cell: (r) => `${r.rateOfInterest.toFixed(2)}%`,
          },
          {
            header: "Status",
            cell: (r) => (
              <StatusPill status={r.disabled ? "Inactive" : "Active"} />
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

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
