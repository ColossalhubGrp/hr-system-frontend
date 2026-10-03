import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Receipt, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getSalesInvoice, listCustomers, listItems } from "@/lib/frappe/sales-invoice";
import { listCompanies } from "@/lib/frappe/accounting";
import { NewSalesInvoiceForm } from "@/components/accounting/new-sales-invoice-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return {
    title: `Edit ${decodeURIComponent(params.name)} · Sales Invoice · Colossal HR`,
  };
}

/** Draft-only edit — see memory draft-docs-editable. */
export default async function EditSalesInvoicePage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  const doc = await getSalesInvoice(name);
  if (!doc) notFound();
  if (doc.docstatus !== 0) {
    redirect(`/accounting/sales-invoices/${encodeURIComponent(name)}`);
  }

  const [companies, customers, items] = await Promise.all([
    listCompanies(),
    listCustomers({ limit: 100 }),
    listItems({ limit: 100 }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/accounting/sales-invoices/${encodeURIComponent(name)}` as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to {name}
        </Link>
      </div>
      <PageHeader
        icon={Receipt}
        crumb={`Accounting · Sales Invoices · ${name} · Edit`}
        title={`Edit ${name}`}
        subtitle="Change anything you need; the invoice stays in Draft until you submit."
      />
      <NewSalesInvoiceForm
        companies={companies}
        customers={customers}
        items={items}
        defaultCompany={doc.company}
        defaultDate={doc.postingDate}
        initial={{
          name: doc.name,
          customer: doc.customer,
          postingDate: doc.postingDate,
          dueDate: doc.dueDate,
          company: doc.company,
          poNo: doc.poNo,
          poDate: doc.poDate,
          remarks: doc.remarks,
          lines: doc.items.map((it) => ({
            itemCode: it.itemCode,
            itemName: it.itemName,
            qty: it.qty,
            rate: it.rate,
            uom: it.uom,
          })),
        }}
      />
    </div>
  );
}
