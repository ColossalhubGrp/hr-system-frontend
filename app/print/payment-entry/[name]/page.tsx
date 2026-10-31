import { notFound, redirect } from "next/navigation";
import { getPaymentEntry } from "@/lib/frappe/accounting";
import { isAuthenticated } from "@/lib/frappe/session";
import {
  DocumentShell,
  DocMetaRow,
  DocSignatures,
  docMoney,
} from "@/components/print/document-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Payment` };
}

export default async function PaymentEntryPrintPage({ params }: { params: { name: string } }) {
  if (!isAuthenticated()) redirect("/login");
  const name = decodeURIComponent(params.name);
  const doc = await getPaymentEntry(name);
  if (!doc) notFound();

  const title =
    doc.paymentType === "Receive"
      ? "PAYMENT RECEIPT"
      : doc.paymentType === "Pay"
      ? "PAYMENT VOUCHER"
      : "TRANSFER VOUCHER";
  const stamps: Array<{ text: string; tone?: "danger" | "muted" }> = [];
  if (doc.docstatus === 0) stamps.push({ text: "Draft — not yet posted" });
  if (doc.docstatus === 2) stamps.push({ text: "Cancelled", tone: "danger" });

  const currency = doc.paidFromCurrency || doc.paidToCurrency || "USD";

  return (
    <DocumentShell company={doc.company} title={title} docNo={doc.name} stamps={stamps}>
      <div className="mt-5 flex justify-between gap-8">
        <div>
          {doc.party && (
            <>
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                {doc.paymentType === "Receive" ? "Received From" : "Paid To"}
              </div>
              <div className="mt-1 text-base font-semibold">{doc.partyName ?? doc.party}</div>
              {doc.partyType && <div className="text-xs text-neutral-500">{doc.partyType}</div>}
            </>
          )}
        </div>
        <table className="text-right">
          <tbody>
            <DocMetaRow label="Date" value={doc.postingDate} />
            {doc.modeOfPayment && <DocMetaRow label="Paid via" value={doc.modeOfPayment} />}
            {doc.referenceNo && <DocMetaRow label="Reference no." value={doc.referenceNo} />}
            {doc.referenceDate && <DocMetaRow label="Reference date" value={doc.referenceDate} />}
          </tbody>
        </table>
      </div>

      {/* Amount panel */}
      <div className="mt-8 border-2 border-neutral-900 p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">Amount</div>
        <div className="mt-1 text-3xl font-bold tabular-nums">
          {currency} {docMoney(doc.paidAmount)}
        </div>
        {doc.receivedAmount !== doc.paidAmount && (
          <div className="mt-1 text-sm text-neutral-600">
            Received: {doc.paidToCurrency || currency} {docMoney(doc.receivedAmount)}
          </div>
        )}
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <tbody>
          {doc.paidFrom && (
            <tr className="border-b border-neutral-200">
              <td className="py-2 pr-4 text-xs font-bold uppercase tracking-wide text-neutral-500">From account</td>
              <td className="py-2">{doc.paidFrom}</td>
            </tr>
          )}
          {doc.paidTo && (
            <tr className="border-b border-neutral-200">
              <td className="py-2 pr-4 text-xs font-bold uppercase tracking-wide text-neutral-500">To account</td>
              <td className="py-2">{doc.paidTo}</td>
            </tr>
          )}
        </tbody>
      </table>

      {doc.remarks && (
        <div className="mt-6 text-xs text-neutral-600">
          <span className="font-bold uppercase tracking-wide">Notes: </span>
          {doc.remarks}
        </div>
      )}

      <DocSignatures
        labels={
          doc.paymentType === "Receive"
            ? ["Received by", "Customer signature"]
            : ["Prepared by", "Authorised by", "Received by"]
        }
      />
    </DocumentShell>
  );
}
