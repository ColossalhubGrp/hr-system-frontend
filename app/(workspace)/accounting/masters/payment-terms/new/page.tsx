import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PaymentTermForm } from "@/components/accounting/payment-term-form";

export const metadata = { title: "New Payment Term · Colossal HR" };

export default function NewPaymentTermPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={ClipboardList}
        crumb="Accounting · Masters · Payment Terms · New"
        title="New Payment Term"
        subtitle="A rule for how invoices become due — used across Sales and Purchase Invoices."
      />
      <PaymentTermForm mode="create" />
    </div>
  );
}
