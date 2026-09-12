import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { FnfActionsBar } from "@/components/fnf/fnf-actions";
import { getFullAndFinal } from "@/lib/frappe/lifecycle-ext";
import { getMyAccess } from "@/lib/frappe/roles";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const f = await getFullAndFinal(decodeURIComponent(params.id));
  return { title: f ? `${f.name} · Colossal HR` : "FnF · Colossal HR" };
}

export default async function FnfDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [fnf, access] = await Promise.all([getFullAndFinal(id), getMyAccess()]);
  if (!fnf) notFound();
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);
  const netPayable =
    fnf.totalPayableAmount - fnf.totalReceivableAmount - fnf.totalAssetRecovery;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/full-and-final" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to statements
      </Link>

      <PageHeader
        icon={FileSpreadsheet}
        crumb={`HR · Full and Final · ${fnf.name}`}
        title={fnf.employeeName ?? fnf.employee}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={fnf.status} />
            <span>· net {fmtMoney(netPayable)}</span>
          </span>
        }
      />

      {canManage && (
        <section className="card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ash-900">Manage</p>
              <p className="text-xs text-ash-500">
                Submit posts the settlement Journal Entry.
              </p>
            </div>
            <FnfActionsBar id={fnf.name} docstatus={fnf.docstatus} />
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Employee
        </h2>
        <div className="mb-5">
          <EmployeeCell id={fnf.employee} name={fnf.employeeName} />
        </div>
        <FieldGrid
          fields={[
            { label: "Company", value: fnf.company },
            { label: "Department", value: fnf.department },
            { label: "Designation", value: fnf.designation },
            {
              label: "Relieving date",
              value: fnf.relievingDate ? fmtDate(fnf.relievingDate) : null,
            },
            {
              label: "From separation",
              value: fnf.employeeSeparation ? (
                <Link
                  href={
                    `/employee/lifecycle/separation/${encodeURIComponent(
                      fnf.employeeSeparation,
                    )}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {fnf.employeeSeparation}
                </Link>
              ) : (
                "—"
              ),
            },
            { label: "Payable account", value: fnf.payrollPayableAccount },
            { label: "Cost center", value: fnf.costCenter },
          ]}
        />
      </section>

      <ChildTable
        title="Payables (to employee)"
        rows={fnf.payables.map((r) => ({
          component: r.component,
          reference: r.reference_document,
          amount: r.amount,
        }))}
        total={fnf.totalPayableAmount}
      />
      <ChildTable
        title="Receivables (from employee)"
        rows={fnf.receivables.map((r) => ({
          component: r.component,
          reference: r.reference_document,
          amount: r.amount,
        }))}
        total={fnf.totalReceivableAmount}
      />
      {fnf.assets.length > 0 && (
        <section className="card p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ash-500">
            Assets
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {fnf.assets.map((a, i) => (
                <tr key={i} className="border-b border-hairline last:border-b-0">
                  <td className="px-3 py-2 text-ash-900">{a.asset_name ?? a.reference}</td>
                  <td className="px-3 py-2 text-ash-700">{a.status ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-ash-800">{fmtMoney(a.cost)}</td>
                  <td className="px-3 py-2 text-ash-700">{a.action ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function ChildTable({
  title,
  rows,
  total,
}: {
  title: string;
  rows: Array<{ component: string; reference: string | null; amount: number }>;
  total: number;
}) {
  return (
    <section className="card p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
          {title}
        </h2>
        <span className="text-sm font-semibold text-ink-900">{fmtMoney(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-500">
          No entries.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs font-medium uppercase tracking-wide text-ash-500">
              <th className="px-3 py-2">Component</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-hairline last:border-b-0">
                <td className="px-3 py-2 text-ash-900">{r.component}</td>
                <td className="px-3 py-2 text-ash-700">{r.reference ?? "—"}</td>
                <td className="px-3 py-2 text-right text-ash-800">{fmtMoney(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
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
