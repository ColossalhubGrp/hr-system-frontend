import { ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listSuppliers } from "@/lib/frappe/purchase-invoice";
import { listItems } from "@/lib/frappe/sales-invoice";
import { listCompanies } from "@/lib/frappe/accounting";
import { NewPurchaseInvoiceForm } from "@/components/accounting/new-purchase-invoice-form";

export const metadata = { title: "New Purchase Invoice · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewPurchaseInvoicePage() {
  const [companies, suppliers, items] = await Promise.all([
    listCompanies(),
    listSuppliers({ limit: 50 }),
    listItems({ limit: 50 }),
  ]);
  const defaultCompany = companies[0]?.name ?? "";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={ReceiptText}
        crumb="Accounting · Purchase Invoices · New"
        title="New Purchase Invoice"
        subtitle="Record a bill from a supplier."
      />
      <NewPurchaseInvoiceForm
        companies={companies}
        suppliers={suppliers}
        items={items}
        defaultCompany={defaultCompany}
        defaultDate={today}
      />
    </div>
  );
}
