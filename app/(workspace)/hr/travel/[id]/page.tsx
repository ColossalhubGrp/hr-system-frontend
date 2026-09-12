import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Plane } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { TravelActionsBar } from "@/components/travel/travel-actions";
import { getTravelRequest } from "@/lib/frappe/finance-training";
import { getMyAccess } from "@/lib/frappe/roles";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const t = await getTravelRequest(decodeURIComponent(params.id));
  return { title: t ? `${t.name} · Colossal HR` : "Travel · Colossal HR" };
}

export default async function TravelDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const [req, access] = await Promise.all([getTravelRequest(id), getMyAccess()]);
  if (!req) notFound();
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);
  const totalCost = req.costings.reduce((a, c) => a + c.amount, 0);
  const totalFunded = req.costings.reduce(
    (a, c) => a + (c.funded_amount ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/travel" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to travel
      </Link>

      <PageHeader
        icon={Plane}
        crumb={`HR · Travel · ${req.name}`}
        title={req.purposeOfTravel ?? req.name}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={req.status} />
            {req.travelType && <span>· {req.travelType}</span>}
          </span>
        }
      />

      {canManage && (
        <section className="card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ash-900">Manage</p>
              <p className="text-xs text-ash-500">
                Submit to lock in the plan; cancel to reverse.
              </p>
            </div>
            <TravelActionsBar id={req.name} docstatus={req.docstatus} />
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Request
        </h2>
        <div className="mb-5">
          <EmployeeCell id={req.employee} name={req.employeeName} />
        </div>
        <FieldGrid
          fields={[
            { label: "Purpose", value: req.purposeOfTravel, wide: true },
            { label: "Type", value: req.travelType },
            { label: "Funding", value: req.travelFunding },
            { label: "From", value: req.fromDate ? fmtDate(req.fromDate) : null },
            { label: "To", value: req.toDate ? fmtDate(req.toDate) : null },
            {
              label: "Advance required",
              value: req.travelAdvanceRequired ? "Yes" : "No",
            },
          ]}
        />
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Costings
        </h2>
        {req.costings.length === 0 ? (
          <p className="rounded-md border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-500">
            No cost lines.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                <th className="px-3 py-2">Expense</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Funded</th>
              </tr>
            </thead>
            <tbody>
              {req.costings.map((c, i) => (
                <tr key={i} className="border-b border-hairline last:border-b-0">
                  <td className="px-3 py-2 text-ash-900">{c.expense_type}</td>
                  <td className="px-3 py-2 text-right text-ash-800">
                    {fmtMoney(c.amount, c.currency)}
                  </td>
                  <td className="px-3 py-2 text-right text-ash-800">
                    {c.funded_amount === null ? "—" : fmtMoney(c.funded_amount, c.currency)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-3 py-2 text-ash-900">Total</td>
                <td className="px-3 py-2 text-right text-ash-900">{fmtMoney(totalCost, null)}</td>
                <td className="px-3 py-2 text-right text-ash-900">{fmtMoney(totalFunded, null)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Itinerary
        </h2>
        {req.itinerary.length === 0 ? (
          <p className="rounded-md border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-500">
            No legs.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                <th className="px-3 py-2">Departure</th>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {req.itinerary.map((l, i) => (
                <tr key={i} className="border-b border-hairline last:border-b-0">
                  <td className="px-3 py-2 text-ash-800">{l.departure_date ? fmtDate(l.departure_date) : "—"}</td>
                  <td className="px-3 py-2 text-ash-900">{l.from_location ?? "—"}</td>
                  <td className="px-3 py-2 text-ash-900">{l.to_location ?? "—"}</td>
                  <td className="px-3 py-2 text-ash-700">{l.mode_of_transport ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-ash-800">
                    {l.cost === null ? "—" : fmtMoney(l.cost, null)}
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
function fmtMoney(n: number, ccy: string | null) {
  const num = n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return ccy ? `${ccy} ${num}` : num;
}
