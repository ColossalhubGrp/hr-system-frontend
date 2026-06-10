import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Receipt } from "lucide-react";
import { FieldGrid } from "@/components/employee/field-grid";
import { StatusPill } from "@/components/common/status-pill";
import { ExpenseDecisionBar } from "@/components/expense/decision-bar";
import { getExpenseClaim } from "@/lib/frappe/expense-claims";
import { approveClaimAction, rejectClaimAction } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const c = await getExpenseClaim(decodeURIComponent(params.id));
  return {
    title: c
      ? `${c.employeeName ?? c.employee} · Claim · Colossal HR`
      : "Expense claim · Colossal HR",
  };
}

export default async function ExpenseClaimDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const claim = await getExpenseClaim(id);
  if (!claim) notFound();

  // Approval is possible while the claim hasn't been submitted yet
  // (docstatus 0). After submit, the doc is locked.
  const decidable = claim.docstatus === 0;
  const approve = approveClaimAction.bind(null, id);
  const reject = rejectClaimAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={"/hr/expense-claims" as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to claims
        </Link>
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Receipt className="h-3.5 w-3.5" />
          HR · Expense Claims · {claim.id}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            {claim.employeeName ?? claim.employee}
          </h1>
          <StatusPill status={claim.status} />
        </div>
        <p className="text-sm text-ash-600">
          {formatMoney(claim.totalClaimedAmount)} claimed ·{" "}
          {formatMoney(claim.totalSanctionedAmount)} sanctioned · filed{" "}
          {fmtDate(claim.postingDate)}
        </p>
      </header>

      {decidable && <ExpenseDecisionBar approve={approve} reject={reject} />}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Claim
        </h2>
        <FieldGrid
          fields={[
            {
              label: "Employee",
              value: (
                <Link
                  href={
                    `/employee/${encodeURIComponent(claim.employee)}` as Route
                  }
                  className="font-medium text-ink-800 hover:underline"
                >
                  {claim.employeeName ?? claim.employee}
                </Link>
              ),
            },
            { label: "Company", value: claim.company },
            { label: "Status", value: claim.status },
            { label: "Approval status", value: claim.approvalStatus },
            { label: "Approver", value: claim.expenseApprover },
            { label: "Posted on", value: fmtDate(claim.postingDate) },
            { label: "Remarks", value: claim.remark, wide: true },
          ]}
        />
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Expenses
        </h2>
        {claim.expenses.length === 0 ? (
          <p className="text-sm text-ash-500">No expense lines on this claim.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-hairline">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">Sanctioned</th>
                </tr>
              </thead>
              <tbody>
                {claim.expenses.map((e, i) => (
                  <tr key={i} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-2.5 text-ash-700">{fmtDate(e.expenseDate)}</td>
                    <td className="px-4 py-2.5 text-ash-800">{e.expenseType ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ash-700">{e.description ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-ash-900">
                      {formatMoney(e.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-ash-900">
                      {formatMoney(e.sanctionedAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
