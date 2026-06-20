import { ShieldCheck, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ApprovePayrollEntryButton } from "@/components/payroll/approve-entry-button";
import { listPayrollEntries } from "@/lib/frappe/payroll";
import { getMyAccess } from "@/lib/frappe/roles";
import { requireGroup } from "@/lib/frappe/require-role";

export const metadata = { title: "Payroll review · Colossal Payroll" };

export default async function PayrollReviewPage() {
  await requireGroup("PAYROLL_REVIEWER", "/payroll/review");
  const access = await getMyAccess();
  // Only show drafts — anything already submitted/cancelled doesn't need a
  // reviewer action. Cap at 200 to bound page weight.
  const result = await listPayrollEntries({
    status: undefined,
    page: 1,
    pageSize: 200,
  });
  const drafts = result.rows.filter((r) => r.docstatus === 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={ShieldCheck}
        crumb="Payroll · Review queue"
        title="Payroll runs pending sign-off"
        subtitle={
          drafts.length === 0
            ? "Nothing waiting for your approval."
            : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} awaiting review.`
        }
      />

      <div className="rounded-card border border-hairline bg-surface p-4 shadow-card">
        <p className="flex items-start gap-2 text-xs text-ash-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            Approving a payroll run submits the underlying Payroll Entry record
            in the system (draft → submitted), which freezes amounts and
            propagates sign-off to all linked Salary Slips. This is reversible
            only via Cancel, which a Payroll Officer must do.
          </span>
        </p>
      </div>

      {drafts.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-6 py-10 text-center text-sm text-ash-600">
          No draft payroll runs at the moment. When a Payroll Officer prepares
          a run, it shows up here for review.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Run</th>
                <th className="px-4 py-2.5 text-left font-medium">Period</th>
                <th className="px-4 py-2.5 text-left font-medium">Frequency</th>
                <th className="px-4 py-2.5 text-left font-medium">Company</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {access.isPayrollReviewer || access.isPayrollAdmin
                    ? "Action"
                    : ""}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {drafts.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/40">
                  <td className="px-4 py-3 font-medium text-ink-800">{r.id}</td>
                  <td className="px-4 py-3 text-ash-700">
                    {r.startDate && r.endDate
                      ? `${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-ash-700">
                    {r.payrollFrequency ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ash-700">{r.company ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <ApprovePayrollEntryButton entryId={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
