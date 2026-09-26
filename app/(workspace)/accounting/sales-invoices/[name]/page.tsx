import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Receipt, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { getSalesInvoice } from "@/lib/frappe/sales-invoice";
import { SalesInvoiceActions } from "@/components/accounting/sales-invoice-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Sales Invoice · Colossal HR` };
}

export default async function SalesInvoiceDetailPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getSalesInvoice(name);
  if (!doc) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/sales-invoices" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Sales Invoices
        </Link>
      </div>

      <PageHeader
        icon={Receipt}
        crumb={`Accounting · Sales Invoices · ${doc.name}`}
        title={doc.name}
        subtitle={`${doc.customerName ?? doc.customer} · ${doc.postingDate} · ${doc.company}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={doc.status || (doc.docstatus === 0 ? "Draft" : doc.docstatus === 1 ? "Submitted" : "Cancelled")} />
            <SalesInvoiceActions name={doc.name} docstatus={doc.docstatus} />
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TotalTile label="Net total" value={money(doc.netTotal, doc.currency)} />
        <TotalTile label="Taxes & charges" value={money(doc.totalTaxes, doc.currency)} />
        <TotalTile label="Grand total" value={money(doc.grandTotal, doc.currency)} strong />
        <TotalTile
          label="Outstanding"
          value={money(doc.outstandingAmount, doc.currency)}
          tone={doc.outstandingAmount > 0 ? "fall" : "rise"}
        />
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Header</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Customer" value={doc.customerName ?? doc.customer} />
          <Detail label="Company" value={doc.company} />
          <Detail label="Currency" value={doc.currency} />
          <Detail label="Conversion rate" value={doc.conversionRate.toFixed(4)} />
          <Detail label="Posting date" value={doc.postingDate} />
          <Detail label="Due date" value={doc.dueDate ?? "—"} />
          <Detail label="PO no." value={doc.poNo ?? "—"} />
          <Detail label="PO date" value={doc.poDate ?? "—"} />
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 text-left">#</th>
                <th className="py-2 text-left">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 text-left">Income Account</th>
                <th className="py-2 text-left">Cost Center</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((it) => (
                <tr key={it.idx} className="border-b border-border/30 last:border-0">
                  <td className="py-2 pr-2 text-muted-foreground">{it.idx}</td>
                  <td className="py-2 pr-2 font-medium">
                    <div>{it.itemName}</div>
                    <div className="text-xs text-muted-foreground">{it.itemCode}</div>
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {it.qty}
                    {it.uom && <span className="ml-1 text-xs text-muted-foreground">{it.uom}</span>}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{it.rate.toFixed(2)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{it.amount.toFixed(2)}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{it.incomeAccount ?? "—"}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{it.costCenter ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {doc.taxes.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Taxes & Charges</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left">Description</th>
                  <th className="py-2 text-left">Account</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {doc.taxes.map((t) => (
                  <tr key={t.idx} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-2">{t.description}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{t.accountHead}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{t.rate.toFixed(2)}%</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{t.taxAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
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

function TotalTile({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "rise" | "fall";
}) {
  const toneCls = tone === "rise" ? "text-rise" : tone === "fall" ? "text-fall" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 tabular-nums ${strong ? "text-2xl font-extrabold" : "text-lg font-semibold"} ${toneCls}`}>
        {value}
      </div>
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

function money(n: number, ccy: string): string {
  return `${ccy} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
