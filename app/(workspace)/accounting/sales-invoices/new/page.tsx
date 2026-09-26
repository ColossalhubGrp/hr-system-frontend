import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCustomers, listItems } from "@/lib/frappe/sales-invoice";
import { listCompanies } from "@/lib/frappe/accounting";
import { NewSalesInvoiceForm } from "@/components/accounting/new-sales-invoice-form";

export const metadata = { title: "New Sales Invoice · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewSalesInvoicePage() {
  const [companies, customers, items] = await Promise.all([
    listCompanies(),
    listCustomers({ limit: 50 }),
    listItems({ limit: 50 }),
  ]);
  const defaultCompany = companies[0]?.name ?? "";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Receipt}
        crumb="Accounting · Sales Invoices · New"
        title="New Sales Invoice"
        subtitle="Bill a customer for goods or services."
      />
      <NewSalesInvoiceForm
        companies={companies}
        customers={customers}
        items={items}
        defaultCompany={defaultCompany}
        defaultDate={today}
      />
    </div>
  );
}
