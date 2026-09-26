import { ClipboardList, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PaymentTermForm } from "@/components/accounting/payment-term-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Payment Term · Colossal HR" };

export default function NewPaymentTermPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/payment-terms" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Payment Terms
        </Link>
      </div>
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
