import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Wallet, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { getPaymentEntry } from "@/lib/frappe/accounting";
import { PaymentEntryActions } from "@/components/accounting/payment-entry-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { name: string };
}) {
  return { title: `${decodeURIComponent(params.name)} · Payment Entry · Colossal HR` };
}

export default async function PaymentEntryDetailPage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  const doc = await getPaymentEntry(name);
  if (!doc) notFound();

  const statusLabel =
    doc.docstatus === 0 ? "Draft" : doc.docstatus === 1 ? "Submitted" : "Cancelled";

  const primaryAmount = doc.paymentType === "Receive" ? doc.receivedAmount : doc.paidAmount;
  const primaryCurrency =
    doc.paymentType === "Receive" ? doc.paidToCurrency : doc.paidFromCurrency;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={"/accounting/payment-entries" as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Payment Entries
        </Link>
      </div>

      <PageHeader
        icon={Wallet}
        crumb={`Accounting · Payment Entries · ${doc.name}`}
        title={doc.name}
        subtitle={`${doc.paymentType} · ${doc.postingDate} · ${doc.company}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={statusLabel} />
            <PaymentEntryActions name={doc.name} docstatus={doc.docstatus} />
          </div>
        }
      />

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Payment
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Type" value={doc.paymentType} />
          <Detail label="Posting Date" value={doc.postingDate} />
          <Detail label="Company" value={doc.company} />
          <Detail
            label="Amount"
            value={
              <span className="text-lg font-bold tabular-nums text-foreground">
                {primaryAmount.toFixed(2)}
                {primaryCurrency && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {primaryCurrency}
                  </span>
                )}
              </span>
            }
          />
          <Detail label="Mode of Payment" value={doc.modeOfPayment ?? "—"} />
          <Detail label="Reference No." value={doc.referenceNo ?? "—"} />
          <Detail label="Reference Date" value={doc.referenceDate ?? "—"} />
          <Detail label="Unallocated" value={doc.unallocatedAmount.toFixed(2)} />
        </div>
      </section>

      {doc.paymentType !== "Internal Transfer" && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Party
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Detail label="Party Type" value={doc.partyType ?? "—"} />
            <Detail label="Party" value={doc.party ?? "—"} />
            <Detail label="Party Name" value={doc.partyName ?? "—"} />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Accounts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail
            label="Paid From"
            value={
              <>
                {doc.paidFrom ?? "—"}
                {doc.paidFromCurrency && (
                  <span className="ml-1 text-xs text-muted-foreground">({doc.paidFromCurrency})</span>
                )}
              </>
            }
          />
          <Detail
            label="Paid To"
            value={
              <>
                {doc.paidTo ?? "—"}
                {doc.paidToCurrency && (
                  <span className="ml-1 text-xs text-muted-foreground">({doc.paidToCurrency})</span>
                )}
              </>
            }
          />
          <Detail label="Paid Amount" value={doc.paidAmount.toFixed(2)} />
          <Detail label="Received Amount" value={doc.receivedAmount.toFixed(2)} />
        </div>
      </section>

      {doc.references.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Allocations
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left">#</th>
                  <th className="py-2 text-left">Reference</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Outstanding</th>
                  <th className="py-2 text-right">Allocated</th>
                </tr>
              </thead>
              <tbody>
                {doc.references.map((r) => (
                  <tr key={r.idx} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-2 text-muted-foreground">{r.idx}</td>
                    <td className="py-2 pr-2 font-medium">
                      {r.referenceDoctype} · <span className="font-mono">{r.referenceName}</span>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.totalAmount.toFixed(2)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.outstandingAmount.toFixed(2)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{r.allocatedAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/70 font-semibold">
                  <td colSpan={4} className="py-2 text-right text-muted-foreground">
                    Total allocated
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {doc.allocatedAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {doc.remarks && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Remarks</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground">{doc.remarks}</p>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  );
}
