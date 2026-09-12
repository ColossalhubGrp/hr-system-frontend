import Link from "next/link";
import type { Route } from "next";
import { FileSpreadsheet, Plus, Coins, Wallet, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { SubTabs } from "@/components/common/sub-tabs";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { FilterRow } from "@/components/common/list-shell";
import { PERFORMANCE_TABS, performanceHrefFor } from "@/components/performance/nav-tabs";
import { listFullAndFinal } from "@/lib/frappe/lifecycle-ext";

export const metadata = { title: "Full and Final · Colossal HR" };

type SP = { status?: string; employee?: string };

export default async function FnfListPage({ searchParams }: { searchParams: SP }) {
  const rows = await listFullAndFinal({
    status: searchParams.status || undefined,
    employee: searchParams.employee || undefined,
  });
  const counts = {
    pending: rows.filter((r) => r.status === "Pending").length,
    unsettled: rows.filter((r) => r.status === "Unsettled").length,
    settled: rows.filter((r) => r.status === "Settled").length,
    paid: rows.filter((r) => r.status === "Paid").length,
  };
  const totalOwed = rows
    .filter((r) => r.docstatus === 1 && r.status !== "Paid")
    .reduce((a, r) => a + Math.max(0, r.totalPayableAmount - r.totalReceivableAmount), 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={FileSpreadsheet}
        crumb="HR · Full and Final"
        title="Full and final statements"
        subtitle={`${rows.length.toLocaleString()} statement${rows.length === 1 ? "" : "s"} in view.`}
        actions={
          <Link
            href={"/hr/full-and-final/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New statement
          </Link>
        }
      />

      <SubTabs
        tabs={PERFORMANCE_TABS}
        active="full-and-final"
        hrefFor={performanceHrefFor}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Pending" value={counts.pending} icon={Coins} tone="amber" />
        <SummaryTile label="Unsettled" value={counts.unsettled} tone="amber" />
        <SummaryTile label="Settled" value={counts.settled} icon={CheckCircle2} tone="rise" />
        <SummaryTile
          label="Net owed"
          value={totalOwed.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
          hint="Payables − receivables (submitted, unpaid)"
          icon={Wallet}
          tone="ink"
        />
      </div>

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          {
            key: "status",
            label: "Status",
            options: ["Pending", "Unsettled", "Settled", "Paid"],
          },
        ]}
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/hr/full-and-final/${encodeURIComponent(r.name)}`}
        empty="No FnF statements match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell
                id={r.employee}
                name={r.employeeName}
                linkTo={`/hr/full-and-final/${encodeURIComponent(r.name)}`}
              />
            ),
          },
          {
            header: "Relieving",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => (r.relievingDate ? fmtDate(r.relievingDate) : "—"),
          },
          {
            header: "Payables",
            className: "text-right text-ash-800",
            cell: (r) => fmtMoney(r.totalPayableAmount),
          },
          {
            header: "Receivables",
            className: "text-right text-ash-800",
            cell: (r) => fmtMoney(r.totalReceivableAmount),
          },
          {
            header: "Asset recovery",
            className: "hidden lg:table-cell text-right text-ash-800",
            cell: (r) => fmtMoney(r.totalAssetRecovery),
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
function fmtMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
