import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { FieldGrid } from "@/components/employee/field-grid";
import { EmployeeCell } from "@/components/employee/employee-cell";
import { AdvanceActionsBar } from "@/components/finance/advance-actions";
import { getEmployeeAdvance } from "@/lib/frappe/finance-training";
import { getMyAccess } from "@/lib/frappe/roles";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const a = await getEmployeeAdvance(decodeURIComponent(params.id));
  return { title: a ? `${a.name} · Colossal HR` : "Advance · Colossal HR" };
}

export default async function AdvanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [adv, access] = await Promise.all([getEmployeeAdvance(id), getMyAccess()]);
  if (!adv) notFound();
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);
  const outstanding = Math.max(
    0,
    adv.paidAmount - adv.claimedAmount - adv.returnAmount,
  );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/employee-advances" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to advances
      </Link>

      <PageHeader
        icon={Wallet}
        crumb={`HR · Advances · ${adv.name}`}
        title={adv.purpose ?? adv.name}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusPill status={adv.status} />
            <span>· {fmtMoney(adv.advanceAmount, adv.currency)}</span>
          </span>
        }
      />

      {canManage && (
        <section className="card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ash-900">Manage</p>
              <p className="text-xs text-ash-500">
                Submit to post GL entries; cancel reverses them.
              </p>
            </div>
            <AdvanceActionsBar id={adv.name} docstatus={adv.docstatus} />
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Advance
        </h2>
        <div className="mb-5">
          <EmployeeCell id={adv.employee} name={adv.employeeName} />
        </div>
        <FieldGrid
          fields={[
            { label: "Purpose", value: adv.purpose, wide: true },
            { label: "Posted", value: fmtDate(adv.postingDate) },
            { label: "Currency", value: adv.currency ?? "—" },
            { label: "Exchange rate", value: String(adv.exchangeRate || 1) },
            { label: "Amount", value: fmtMoney(adv.advanceAmount, adv.currency) },
            { label: "Paid", value: fmtMoney(adv.paidAmount, adv.currency) },
            { label: "Claimed", value: fmtMoney(adv.claimedAmount, adv.currency) },
            { label: "Returned", value: fmtMoney(adv.returnAmount, adv.currency) },
            {
              label: "Outstanding",
              value: fmtMoney(outstanding, adv.currency),
            },
            { label: "Mode of payment", value: adv.modeOfPayment ?? "—" },
            { label: "Advance account", value: adv.advanceAccount ?? "—" },
          ]}
        />
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
