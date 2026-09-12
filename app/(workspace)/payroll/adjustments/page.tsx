import Link from "next/link";
import type { Route } from "next";
import { CircleDollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SubTabs } from "@/components/common/sub-tabs";
import { StatusPill } from "@/components/common/status-pill";
import { DataTable } from "@/components/common/data-table";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { AdjustmentRowActions } from "@/components/pay-adjustments/row-actions";
import {
  listAdditionalSalaries,
  listEmployeeIncentives,
  listRetentionBonuses,
} from "@/lib/frappe/pay-adjustments";

export const metadata = { title: "Pay Adjustments · Colossal HR" };

type SP = { tab?: string };
type Tab = "additional" | "retention" | "incentive";

function tabFrom(v: string | undefined): Tab {
  return v === "retention" || v === "incentive" ? v : "additional";
}

export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const tab = tabFrom(searchParams.tab);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={CircleDollarSign}
        crumb="Payroll · Adjustments"
        title="Pay adjustments"
        subtitle="One-off bonuses, arrears, incentives and retention payouts. Additional Salary is the primitive — Retention Bonus and Employee Incentive are convenience wrappers that produce one on submit."
        actions={
          <Link
            href={`/payroll/adjustments/new?type=${tab}` as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            {tab === "retention"
              ? "New retention bonus"
              : tab === "incentive"
                ? "New incentive"
                : "New adjustment"}
          </Link>
        }
      />

      <SubTabs
        tabs={[
          { id: "additional", label: "Additional Salary" },
          { id: "retention", label: "Retention Bonuses" },
          { id: "incentive", label: "Employee Incentives" },
        ]}
        active={tab}
        hrefFor={(id) =>
          id === "additional"
            ? "/payroll/adjustments"
            : `/payroll/adjustments?tab=${id}`
        }
      />

      {tab === "additional" && <AdditionalSalaryList />}
      {tab === "retention" && <RetentionList />}
      {tab === "incentive" && <IncentiveList />}
    </div>
  );
}

async function AdditionalSalaryList() {
  const rows = await listAdditionalSalaries();
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.name}
      empty="No one-off adjustments on file."
      columns={[
        {
          header: "Employee",
          cell: (r) => <EmployeeCell id={r.employee} name={r.employeeName} />,
        },
        {
          header: "Component",
          className: "text-ash-800",
          cell: (r) => r.salaryComponent,
        },
        {
          header: "Amount",
          className: "text-right text-ash-800",
          cell: (r) => fmtMoney(r.amount, r.currency),
        },
        {
          header: "Payroll date",
          className: "text-ash-700",
          cell: (r) => (r.payrollDate ? fmtDate(r.payrollDate) : "—"),
        },
        {
          header: "Type",
          className: "hidden md:table-cell",
          cell: (r) =>
            r.isRecurring ? (
              <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-800">
                Recurring · {r.fromDate ?? "—"} → {r.toDate ?? "—"}
              </span>
            ) : (
              <span className="rounded-chip bg-canvas px-2 py-0.5 text-[11px] font-medium text-ash-700">
                One-off
              </span>
            ),
        },
        {
          header: "Source",
          className: "hidden lg:table-cell text-ash-700 text-xs",
          cell: (r) =>
            r.refDoctype && r.refDocname
              ? `${r.refDoctype} · ${r.refDocname}`
              : "—",
        },
        {
          header: "Status",
          cell: (r) => <StatusPill status={r.status} />,
        },
        {
          header: "",
          className: "w-32 text-right",
          cell: (r) => (
            <AdjustmentRowActions
              doctype="Additional Salary"
              name={r.name}
              docstatus={r.docstatus}
            />
          ),
        },
      ]}
    />
  );
}

async function RetentionList() {
  const rows = await listRetentionBonuses();
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.name}
      empty="No retention bonuses on file."
      columns={[
        {
          header: "Employee",
          cell: (r) => <EmployeeCell id={r.employee} name={r.employeeName} />,
        },
        {
          header: "Component",
          className: "text-ash-800",
          cell: (r) => r.salaryComponent,
        },
        {
          header: "Amount",
          className: "text-right text-ash-800",
          cell: (r) => fmtMoney(r.bonusAmount, null),
        },
        {
          header: "Payment date",
          className: "text-ash-700",
          cell: (r) => fmtDate(r.bonusPaymentDate),
        },
        { header: "Status", cell: (r) => <StatusPill status={r.status} /> },
        {
          header: "",
          className: "w-32 text-right",
          cell: (r) => (
            <AdjustmentRowActions
              doctype="Retention Bonus"
              name={r.name}
              docstatus={r.docstatus}
            />
          ),
        },
      ]}
    />
  );
}

async function IncentiveList() {
  const rows = await listEmployeeIncentives();
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.name}
      empty="No employee incentives on file."
      columns={[
        {
          header: "Employee",
          cell: (r) => <EmployeeCell id={r.employee} name={r.employeeName} />,
        },
        {
          header: "Component",
          className: "text-ash-800",
          cell: (r) => r.salaryComponent,
        },
        {
          header: "Amount",
          className: "text-right text-ash-800",
          cell: (r) => fmtMoney(r.incentiveAmount, null),
        },
        {
          header: "Payroll date",
          className: "text-ash-700",
          cell: (r) => fmtDate(r.payrollDate),
        },
        { header: "Status", cell: (r) => <StatusPill status={r.status} /> },
        {
          header: "",
          className: "w-32 text-right",
          cell: (r) => (
            <AdjustmentRowActions
              doctype="Employee Incentive"
              name={r.name}
              docstatus={r.docstatus}
            />
          ),
        },
      ]}
    />
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
  if (!Number.isFinite(n)) return "—";
  const num = n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return ccy ? `${ccy} ${num}` : num;
}
