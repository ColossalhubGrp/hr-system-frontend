import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Wallet, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import {
  getPaymentEntry,
  listCompanies,
  listAccounts,
  listModesOfPayment,
  PAYMENT_TYPES,
  PARTY_TYPES,
} from "@/lib/frappe/accounting";
import { NewPaymentEntryForm } from "@/components/accounting/new-payment-entry-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return {
    title: `Edit ${decodeURIComponent(params.name)} · Payment Entry · Colossal HR`,
  };
}

/** Draft-only edit — see memory draft-docs-editable. */
export default async function EditPaymentEntryPage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  const doc = await getPaymentEntry(name);
  if (!doc) notFound();
  if (doc.docstatus !== 0) {
    redirect(`/accounting/payment-entries/${encodeURIComponent(name)}`);
  }

  const [companies, modes] = await Promise.all([listCompanies(), listModesOfPayment()]);
  const accounts = await listAccounts(doc.company, { limit: 100 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/accounting/payment-entries/${encodeURIComponent(name)}` as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to {name}
        </Link>
      </div>
      <PageHeader
        icon={Wallet}
        crumb={`Accounting · Payment Entries · ${name} · Edit`}
        title={`Edit ${name}`}
        subtitle="Update any field; the voucher stays in Draft until you submit."
      />
      <NewPaymentEntryForm
        companies={companies}
        accounts={accounts}
        modes={modes}
        partyTypes={[...PARTY_TYPES]}
        paymentTypes={[...PAYMENT_TYPES]}
        defaultCompany={doc.company}
        defaultDate={doc.postingDate}
        initial={{
          name: doc.name,
          paymentType: doc.paymentType,
          postingDate: doc.postingDate,
          company: doc.company,
          partyType: doc.partyType,
          party: doc.party,
          paidFrom: doc.paidFrom,
          paidTo: doc.paidTo,
          paidAmount: doc.paidAmount,
          receivedAmount: doc.receivedAmount,
          modeOfPayment: doc.modeOfPayment,
          referenceNo: doc.referenceNo,
          referenceDate: doc.referenceDate,
          remarks: doc.remarks,
        }}
      />
    </div>
  );
}
