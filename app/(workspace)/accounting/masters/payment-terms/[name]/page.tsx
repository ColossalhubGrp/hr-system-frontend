import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ClipboardList, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getPaymentTerm } from "@/lib/frappe/masters/payment-term";
import { PaymentTermForm } from "@/components/accounting/payment-term-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Payment Term · Colossal HR` };
}

export default async function EditPaymentTermPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getPaymentTerm(name);
  if (!doc) notFound();

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
        crumb={`Accounting · Masters · Payment Terms · ${doc.paymentTermName}`}
        title={doc.paymentTermName}
        subtitle={`${doc.invoicePortion}% · ${doc.creditDays}d + ${doc.creditMonths}m · ${doc.dueDateBasedOn}`}
      />
      <PaymentTermForm
        mode="edit"
        name={doc.name}
        initial={{
          paymentTermName: doc.paymentTermName,
          description: doc.description,
          invoicePortion: doc.invoicePortion,
          creditDays: doc.creditDays,
          creditMonths: doc.creditMonths,
          dueDateBasedOn: doc.dueDateBasedOn,
          discount: doc.discount,
          discountType: doc.discountType,
        }}
      />
    </div>
  );
}
