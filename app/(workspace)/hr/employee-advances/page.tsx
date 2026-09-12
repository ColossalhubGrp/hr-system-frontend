import Link from "next/link";
import type { Route } from "next";
import { Wallet, Plus, FileText, CheckCircle2, Coins } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SummaryTile } from "@/components/common/summary-tile";
import { SubTabs } from "@/components/common/sub-tabs";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { FilterRow } from "@/components/common/list-shell";
import { listEmployeeAdvances } from "@/lib/frappe/finance-training";

export const metadata = { title: "Employee Advances · Colossal HR" };

type SP = { status?: string; employee?: string };

export default async function EmployeeAdvancesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const rows = await listEmployeeAdvances({
    status: searchParams.status || undefined,
    employee: searchParams.employee || undefined,
  });

  const counts = {
    draft: rows.filter((r) => r.status === "Draft").length,
    unclaimed: rows.filter((r) => r.status === "Unclaimed").length,
    partly: rows.filter((r) => r.status === "Partly Claimed").length,
    claimed: rows.filter((r) => r.status === "Claimed").length,
    outstanding: rows
      .filter((r) => r.docstatus === 1)
      .reduce(
        (a, r) => a + Math.max(0, r.paidAmount - r.claimedAmount - r.returnAmount),
        0,
      ),
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Wallet}
        crumb="HR · Employee Advances"
        title="Employee advances"
        subtitle={`${rows.length.toLocaleString()} advance${rows.length === 1 ? "" : "s"} in view.`}
        actions={
          <Link
            href={"/hr/employee-advances/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New advance
          </Link>
        }
      />

      <SubTabs
        tabs={[
          { id: "claims", label: "Claims" },
          { id: "advances", label: "Advances" },
          { id: "travel", label: "Travel" },
        ]}
        active="advances"
        hrefFor={(id) =>
          id === "claims"
            ? "/hr/expense-claims"
            : id === "advances"
              ? "/hr/employee-advances"
              : "/hr/travel"
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Draft" value={counts.draft} icon={FileText} tone="amber" />
        <SummaryTile label="Unclaimed" value={counts.unclaimed} icon={Coins} tone="ink" />
        <SummaryTile label="Partly claimed" value={counts.partly} tone="amber" />
        <SummaryTile
          label="Outstanding"
          value={counts.outstanding.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
          hint="Paid − claimed − returned"
          icon={CheckCircle2}
          tone="rise"
        />
      </div>

      <FilterRow
        search={{ key: "employee", placeholder: "Filter by employee ID" }}
        selects={[
          {
            key: "status",
            label: "Status",
            options: ["Draft", "Paid", "Unpaid", "Unclaimed", "Claimed", "Partly Claimed", "Returned", "Cancelled"],
          },
        ]}
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/hr/employee-advances/${encodeURIComponent(r.name)}`}
        empty="No advances match the current filters."
        columns={[
          {
            header: "Employee",
            cell: (r) => (
              <EmployeeCell
                id={r.employee}
                name={r.employeeName}
                linkTo={`/hr/employee-advances/${encodeURIComponent(r.name)}`}
              />
            ),
          },
          {
            header: "Purpose",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => r.purpose ?? "—",
          },
          {
            header: "Posted",
            className: "hidden md:table-cell text-ash-700",
            cell: (r) => fmtDate(r.postingDate),
          },
          {
            header: "Advance",
            className: "text-ash-800",
            cell: (r) => fmtMoney(r.advanceAmount, r.currency),
          },
          {
            header: "Claimed",
            className: "hidden sm:table-cell text-ash-800",
            cell: (r) => fmtMoney(r.claimedAmount, r.currency),
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
function fmtMoney(n: number, ccy: string | null) {
  const num = n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return ccy ? `${ccy} ${num}` : num;
}
