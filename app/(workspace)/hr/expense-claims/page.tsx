import Link from "next/link";
import type { Route } from "next";
import {
  Receipt,
  Plus,
  FileText,
  CheckCircle2,
  Banknote,
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
  listExpenseClaims,
  EXPENSE_CLAIM_STATUSES,
} from "@/lib/frappe/expense-claims";

export const metadata = { title: "Expense Claims · Colossal HR" };

type SP = { status?: string; employee?: string; page?: string };

export default async function ExpenseClaimsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const result = await listExpenseClaims({
    status: searchParams.status || undefined,
    employee: searchParams.employee || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Receipt}
        crumb="HR · Expense Claims"
        title="Expense claims"
        subtitle={`${result.total.toLocaleString()} claims in view.`}
        actions={
          <Link
            href={"/hr/expense-claims/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New claim
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryTile
          label="Submitted"
          value={result.counts.submitted}
          icon={FileText}
          tone="amber"
        />
        <SummaryTile
          label="Approved"
          value={result.counts.approved}
          icon={CheckCircle2}
          tone="rise"
        />
        <SummaryTile
          label="Paid"
          value={result.counts.paid}
          icon={Banknote}
          tone="rise"
        />
        <SummaryTile
          label="Rejected"
          value={result.counts.rejected}
          icon={XCircle}
          tone="fall"
        />
        <SummaryTile
          label="Sanctioned"
          value={formatMoney(result.counts.sanctionedTotal)}
          hint="Approved + paid"
          tone="ink"
        />
      </div>

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          { key: "status", label: "Status", options: [...EXPENSE_CLAIM_STATUSES] },
        ]}
      />

      <DataTable
        rows={result.rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/hr/expense-claims/${encodeURIComponent(r.id)}`}
        empty="No expense claims match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell id={r.employee} name={r.employeeName} />
            ),
          },
          {
            header: "Posted",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => fmtDate(r.postingDate),
          },
          {
            header: "Claimed",
            className: "text-ash-800",
            cell: (r) => formatMoney(r.totalClaimedAmount),
          },
          {
            header: "Sanctioned",
            className: "hidden sm:table-cell text-ash-800",
            cell: (r) => formatMoney(r.totalSanctionedAmount),
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
