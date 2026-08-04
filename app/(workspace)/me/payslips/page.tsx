import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/list-shell";
import { readSession } from "@/lib/frappe/session";
import { frappeCall } from "@/lib/frappe/client";
import { listMyPayslips } from "@/lib/frappe/my-self-service";

export const metadata = { title: "My payslips · Colossal HR" };

export default async function MyPayslipsPage() {
  const [rows, empId] = await Promise.all([
    listMyPayslips(),
    resolveMyEmployeeId(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/me" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to my workspace
      </Link>

      <PageHeader
        icon={ReceiptText}
        crumb="My workspace · Payslips"
        title="My payslips"
        subtitle="Salary slips on file. Only the slips that belong to you are visible — your colleagues' slips are never shown here."
      />

      <section className="card overflow-hidden p-0">
        {rows.length === 0 ? (
          <EmptyState>
            No payslips on file yet. Once payroll runs, your slips appear
            here.
          </EmptyState>
        ) : (
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            empty="—"
            columns={[
              {
                header: "Period",
                cell: (r) => (
                  <span className="font-medium text-ash-900">
                    {r.periodLabel}
                  </span>
                ),
              },
              {
                header: "Pay date",
                className: "text-ash-700",
                cell: (r) => (r.payDate ? fmtDate(r.payDate) : "—"),
              },
              {
                header: "Net (USD)",
                className: "text-ash-800 font-medium",
                cell: (r) => (r.netUsd > 0 ? `US$${r.netUsd.toLocaleString()}` : "—"),
              },
              {
                header: "Net (ZiG)",
                className: "text-ash-800 font-medium",
                cell: (r) => (r.netZig > 0 ? `ZiG ${r.netZig.toLocaleString()}` : "—"),
              },
              {
                header: "",
                className: "text-right",
                cell: (r) =>
                  empId ? (
                    <Link
                      href={
                        `/payroll/${encodeURIComponent(r.payrollRun)}/payslip/${encodeURIComponent(empId)}?from=me` as Route
                      }
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open →
                    </Link>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}

/** The per-slip detail page lives under /payroll/<run>/payslip/<empId>,
 *  so we need the employee id to build the row link. Mirrors what
 *  listMyPayslips uses internally. */
async function resolveMyEmployeeId(): Promise<string | null> {
  const session = readSession();
  if (!session.userId) return null;
  try {
    type Row = { name: string };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["name"],
        filters: JSON.stringify([["user_id", "=", session.userId]]),
        limit_page_length: 1,
      },
      as: "user",
    });
    return rows[0]?.name ?? null;
  } catch {
    return null;
  }
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
