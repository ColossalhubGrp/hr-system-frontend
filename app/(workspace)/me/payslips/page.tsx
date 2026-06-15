import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/list-shell";
import { StatusPill } from "@/components/common/status-pill";
import { listMyPayslips } from "@/lib/frappe/my-self-service";

export const metadata = { title: "My payslips · Colossal HR" };

const TONES: Record<string, string> = {
  Submitted: "bg-rise/10 text-rise ring-rise/20",
  Draft: "bg-amber-100 text-amber-800 ring-amber-200",
  Cancelled: "bg-ash-100 text-ash-700 ring-ash-200",
};

export default async function MyPayslipsPage() {
  const rows = await listMyPayslips();
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
              { header: "Slip", cell: (r) => <span className="font-medium text-ash-900">{r.id}</span> },
              { header: "Period start", cell: (r) => fmtDate(r.startDate), className: "text-ash-700" },
              { header: "Period end", cell: (r) => fmtDate(r.endDate), className: "text-ash-700" },
              { header: "Status", cell: (r) => <StatusPill status={r.status} tones={TONES} /> },
              {
                header: "Net pay",
                className: "text-ash-800 font-medium",
                cell: (r) =>
                  r.netPay !== null ? r.netPay.toLocaleString() : "—",
              },
            ]}
          />
        )}
      </section>
    </div>
  );
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
