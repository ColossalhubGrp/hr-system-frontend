import { notFound, redirect } from "next/navigation";
import { getPurchaseInvoice } from "@/lib/frappe/purchase-invoice";
import { isAuthenticated } from "@/lib/frappe/session";
import {
  DocumentShell,
  DocMetaRow,
  DocTotalRow,
  docMoney,
} from "@/components/print/document-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Purchase Invoice` };
}

export default async function PurchaseInvoicePrintPage({ params }: { params: { name: string } }) {
  if (!isAuthenticated()) redirect("/login");
  const name = decodeURIComponent(params.name);
  const doc = await getPurchaseInvoice(name);
  if (!doc) notFound();

  const stamps: Array<{ text: string; tone?: "danger" | "muted" }> = [];
  if (doc.docstatus === 0) stamps.push({ text: "Draft — not yet recorded" });
  if (doc.docstatus === 2) stamps.push({ text: "Cancelled", tone: "danger" });

  return (
    <DocumentShell company={doc.company} title="PURCHASE INVOICE" docNo={doc.name} stamps={stamps}>
      <div className="mt-5 flex justify-between gap-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">Supplier</div>
          <div className="mt-1 text-base font-semibold">{doc.supplierName ?? doc.supplier}</div>
          {doc.billNo && (
            <div className="mt-1 text-xs text-neutral-600">
              Supplier bill no. <span className="font-mono">{doc.billNo}</span>
              {doc.billDate ? ` · dated ${doc.billDate}` : ""}
            </div>
          )}
        </div>
        <table className="text-right">
          <tbody>
            <DocMetaRow label="Posting date" value={doc.postingDate} />
            {doc.dueDate && <DocMetaRow label="Due date" value={doc.dueDate} />}
            <DocMetaRow label="Currency" value={doc.currency} />
          </tbody>
        </table>
      </div>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left text-xs font-bold uppercase tracking-wide">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Description</th>
            <th className="py-2 pr-2 text-right">Qty</th>
            <th className="py-2 pr-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it) => (
            <tr key={it.idx} className="border-b border-neutral-200 align-top">
              <td className="py-2 pr-2 text-neutral-500">{it.idx}</td>
              <td className="py-2 pr-2">
                <div className="font-medium">{it.itemName}</div>
                {it.description && it.description !== it.itemName && (
                  <div className="text-xs text-neutral-500">{it.description}</div>
                )}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {it.qty}
                {it.uom ? ` ${it.uom}` : ""}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">{docMoney(it.rate)}</td>
              <td className="py-2 text-right tabular-nums">{docMoney(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <table className="w-64">
          <tbody>
            <DocTotalRow label="Net total" value={`${doc.currency} ${docMoney(doc.netTotal)}`} />
            {doc.taxes.map((t) => (
              <DocTotalRow
                key={t.idx}
                label={`${t.description}${t.rate ? ` (${t.rate}%)` : ""}`}
                value={`${doc.currency} ${docMoney(t.taxAmount)}`}
              />
            ))}
            <tr className="border-t-2 border-neutral-900 text-base font-bold">
              <td className="py-2">Total</td>
              <td className="py-2 text-right tabular-nums">
                {doc.currency} {docMoney(doc.grandTotal)}
              </td>
            </tr>
            {doc.outstandingAmount > 0 && doc.docstatus === 1 && (
              <DocTotalRow
                label="Amount owing"
                value={`${doc.currency} ${docMoney(doc.outstandingAmount)}`}
                strong
              />
            )}
          </tbody>
        </table>
      </div>

      {doc.remarks && (
        <div className="mt-6 text-xs text-neutral-600">
          <span className="font-bold uppercase tracking-wide">Notes: </span>
          {doc.remarks}
        </div>
      )}
    </DocumentShell>
  );
}
