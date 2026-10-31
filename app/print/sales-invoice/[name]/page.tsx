import { notFound, redirect } from "next/navigation";
import { getSalesInvoice } from "@/lib/frappe/sales-invoice";
import { getCompany } from "@/lib/frappe/companies";
import { isAuthenticated, resolveAvatarUrl } from "@/lib/frappe/session";
import { QrCode } from "@/components/common/qr-code";
import { PrintPageControls } from "@/components/common/print-page-controls";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Invoice` };
}

/**
 * Printable A4 tax invoice. Lives outside the workspace shell so the
 * paper carries only the document. When the invoice is fiscalised the
 * ZIMRA QR + receipt details are part of the printed page, as the
 * regulations require.
 */
export default async function SalesInvoicePrintPage({ params }: { params: { name: string } }) {
  if (!isAuthenticated()) redirect("/login");
  const name = decodeURIComponent(params.name);
  const doc = await getSalesInvoice(name);
  if (!doc) notFound();
  const company = await getCompany(doc.company).catch(() => null);

  const isCancelled = doc.docstatus === 2;
  const isDraft = doc.docstatus === 0;
  const title = doc.fiscalStatus ? "FISCAL TAX INVOICE" : "TAX INVOICE";

  return (
    <div className="min-h-screen bg-muted/30 py-8 print:bg-white print:py-0">
      <PrintPageControls />

      <div className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-neutral-900 shadow-xl print:max-w-none print:p-0 print:shadow-none">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
          <div className="flex items-start gap-4">
            {company?.companyLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveAvatarUrl(company.companyLogo) ?? undefined}
                alt=""
                className="max-h-16 w-auto max-w-[160px] object-contain"
              />
            )}
            <div>
              <div className="text-2xl font-bold tracking-tight">{doc.company}</div>
              {company?.taxId && <div className="mt-1">VAT / TIN: {company.taxId}</div>}
              {company?.phoneNo && <div>Tel: {company.phoneNo}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold tracking-wide">{title}</div>
            <div className="mt-1 font-mono">{doc.name}</div>
            {isDraft && (
              <div className="mt-1 inline-block border border-neutral-400 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-neutral-500">
                Draft — not yet issued
              </div>
            )}
            {isCancelled && (
              <div className="mt-1 inline-block border border-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-red-600">
                Cancelled
              </div>
            )}
          </div>
        </div>

        {/* Parties + meta */}
        <div className="mt-5 flex justify-between gap-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">Billed To</div>
            <div className="mt-1 text-base font-semibold">{doc.customerName ?? doc.customer}</div>
          </div>
          <table className="text-right">
            <tbody>
              <MetaRow label="Invoice date" value={doc.postingDate} />
              {doc.dueDate && <MetaRow label="Due date" value={doc.dueDate} />}
              <MetaRow label="Currency" value={doc.currency} />
              {doc.poNo && <MetaRow label="Your order no." value={doc.poNo} />}
            </tbody>
          </table>
        </div>

        {/* Items */}
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
                <td className="py-2 pr-2 text-right tabular-nums">{money(it.rate)}</td>
                <td className="py-2 text-right tabular-nums">{money(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <table className="w-64">
            <tbody>
              <TotalRow label="Net total" value={`${doc.currency} ${money(doc.netTotal)}`} />
              {doc.taxes.map((t) => (
                <TotalRow
                  key={t.idx}
                  label={`${t.description}${t.rate ? ` (${t.rate}%)` : ""}`}
                  value={`${doc.currency} ${money(t.taxAmount)}`}
                />
              ))}
              <tr className="border-t-2 border-neutral-900 text-base font-bold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right tabular-nums">
                  {doc.currency} {money(doc.grandTotal)}
                </td>
              </tr>
              {doc.outstandingAmount > 0 && doc.docstatus === 1 && (
                <TotalRow
                  label="Amount due"
                  value={`${doc.currency} ${money(doc.outstandingAmount)}`}
                  strong
                />
              )}
            </tbody>
          </table>
        </div>

        {/* Fiscal block */}
        {doc.fiscalStatus && doc.fiscalQrData && (
          <div className="mt-8 flex items-start gap-5 border-t border-neutral-300 pt-5">
            <QrCode value={doc.fiscalQrData} size={104} />
            <div className="text-xs leading-relaxed">
              <div className="font-bold uppercase tracking-wide">ZIMRA Fiscalisation</div>
              <div className="mt-1">
                Fiscal receipt no. <span className="font-mono">{doc.fiscalReceiptGlobalNo}</span>
                {" · "}Fiscal day <span className="font-mono">{doc.fiscalDayNo}</span>
              </div>
              <div className="mt-1 break-all text-neutral-600">
                Verify at: {doc.fiscalQrData}
              </div>
              {doc.fiscalStatus === "Reversed" && doc.fiscalCnReceiptGlobalNo && (
                <div className="mt-1 font-semibold">
                  Reversed by credit note receipt no.{" "}
                  <span className="font-mono">{doc.fiscalCnReceiptGlobalNo}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {doc.remarks && (
          <div className="mt-6 text-xs text-neutral-600">
            <span className="font-bold uppercase tracking-wide">Notes: </span>
            {doc.remarks}
          </div>
        )}

        <div className="mt-10 border-t border-neutral-200 pt-3 text-center text-[11px] text-neutral-400">
          Generated by Colossal Suite · {new Date().toISOString().slice(0, 10)}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td className="pr-4 text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</td>
      <td className="tabular-nums">{value}</td>
    </tr>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={strong ? "font-bold" : ""}>
      <td className="py-1 text-neutral-600">{label}</td>
      <td className="py-1 text-right tabular-nums">{value}</td>
    </tr>
  );
}

function money(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
