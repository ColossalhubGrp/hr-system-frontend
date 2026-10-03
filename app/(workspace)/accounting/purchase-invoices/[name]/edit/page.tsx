import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ReceiptText, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getPurchaseInvoice, listSuppliers } from "@/lib/frappe/purchase-invoice";
import { listItems } from "@/lib/frappe/sales-invoice";
import { listCompanies } from "@/lib/frappe/accounting";
import { NewPurchaseInvoiceForm } from "@/components/accounting/new-purchase-invoice-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return {
    title: `Edit ${decodeURIComponent(params.name)} · Purchase Invoice · Colossal HR`,
  };
}

/** Draft-only edit — see memory draft-docs-editable. */
export default async function EditPurchaseInvoicePage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  const doc = await getPurchaseInvoice(name);
  if (!doc) notFound();
  if (doc.docstatus !== 0) {
    redirect(`/accounting/purchase-invoices/${encodeURIComponent(name)}`);
  }

  const [companies, suppliers, items] = await Promise.all([
    listCompanies(),
    listSuppliers({ limit: 100 }),
    listItems({ limit: 100 }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/accounting/purchase-invoices/${encodeURIComponent(name)}` as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to {name}
        </Link>
      </div>
      <PageHeader
        icon={ReceiptText}
        crumb={`Accounting · Purchase Invoices · ${name} · Edit`}
        title={`Edit ${name}`}
        subtitle="Update any field; the bill stays in Draft until you submit."
      />
      <NewPurchaseInvoiceForm
        companies={companies}
        suppliers={suppliers}
        items={items}
        defaultCompany={doc.company}
        defaultDate={doc.postingDate}
        initial={{
          name: doc.name,
          supplier: doc.supplier,
          postingDate: doc.postingDate,
          dueDate: doc.dueDate,
          company: doc.company,
          billNo: doc.billNo,
          billDate: doc.billDate,
          remarks: doc.remarks,
          lines: doc.items.map((it) => ({
            itemCode: it.itemCode,
            qty: it.qty,
            rate: it.rate,
            uom: it.uom,
          })),
        }}
      />
    </div>
  );
}
