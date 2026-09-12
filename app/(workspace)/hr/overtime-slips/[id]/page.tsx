import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { OvertimeSlipActions } from "@/components/overtime-slip/slip-actions";
import { getOvertimeSlip } from "@/lib/frappe/lifecycle-ext";
import { getMyAccess } from "@/lib/frappe/roles";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const s = await getOvertimeSlip(decodeURIComponent(params.id));
  return { title: s ? `${s.name} · Colossal HR` : "Overtime slip · Colossal HR" };
}

export default async function OvertimeSlipDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [slip, access] = await Promise.all([getOvertimeSlip(id), getMyAccess()]);
  if (!slip) notFound();
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/overtime-slips" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to slips
      </Link>

      <PageHeader
        icon={Clock3}
        crumb={`HR · Overtime · ${slip.name}`}
        title={slip.employeeName ?? slip.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={slip.status} />
            <span>
              · {slip.totalOvertimeHours.toFixed(1)} h ·{" "}
              {slip.totalOvertimeAmount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
          </span>
        }
      />

      {canManage && (
        <section className="card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ash-900">Manage</p>
              <p className="text-xs text-ash-500">
                Fetch overtime pulls Attendance rows in range; submit posts to
                Additional Salary so the amount flows into the next Salary
                Slip.
              </p>
            </div>
            <OvertimeSlipActions id={slip.name} docstatus={slip.docstatus} />
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Slip
        </h2>
        <div className="mb-5">
          <EmployeeCell id={slip.employee} name={slip.employeeName} />
        </div>
        <FieldGrid
          fields={[
            { label: "Company", value: slip.company },
            { label: "From", value: slip.fromDate ? fmtDate(slip.fromDate) : null },
            { label: "To", value: slip.toDate ? fmtDate(slip.toDate) : null },
            { label: "Total hours", value: slip.totalOvertimeHours.toFixed(2) },
            {
              label: "Total amount",
              value: slip.totalOvertimeAmount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }),
            },
          ]}
        />
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Overtime details
        </h2>
        {slip.overtimeDetails.length === 0 ? (
          <p className="rounded-md border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-500">
            No details yet — click <b>Fetch overtime</b> above to pull them from
            Attendance.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Attendance</th>
                <th className="px-3 py-2 text-right">Hours</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {slip.overtimeDetails.map((r, i) => (
                <tr key={i} className="border-b border-hairline last:border-b-0">
                  <td className="px-3 py-2 text-ash-800">{r.date ? fmtDate(r.date) : "—"}</td>
                  <td className="px-3 py-2 text-ash-700">{r.attendance}</td>
                  <td className="px-3 py-2 text-right text-ash-800">{r.overtime_hours.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-ash-800">
                    {r.rate === undefined ? "—" : r.rate.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-900">
                    {r.amount === undefined ? "—" : r.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
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
