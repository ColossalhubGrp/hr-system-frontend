import { Wallet, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import {
  listCompanies,
  listAccounts,
  listModesOfPayment,
  PAYMENT_TYPES,
  PARTY_TYPES,
} from "@/lib/frappe/accounting";
import { NewPaymentEntryForm } from "@/components/accounting/new-payment-entry-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Payment Entry · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

/**
 * Loads companies, accounts (for the default company) and modes of
 * payment. Ships them to the client form which owns the interactive
 * state.
 */
export default async function NewPaymentEntryPage() {
  const [companies, modes] = await Promise.all([listCompanies(), listModesOfPayment()]);
  const defaultCompany = companies[0]?.name ?? "";
  const accounts = defaultCompany
    ? await listAccounts(defaultCompany, { limit: 50 })
    : [];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/payment-entries" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Payment Entries
        </Link>
      </div>
      <PageHeader
        icon={Wallet}
        crumb="Accounting · Payment Entries · New"
        title="New Payment Entry"
        subtitle="Record a customer receipt, supplier payment or internal transfer."
      />
      <NewPaymentEntryForm
        companies={companies}
        accounts={accounts}
        modes={modes}
        partyTypes={[...PARTY_TYPES]}
        paymentTypes={[...PAYMENT_TYPES]}
        defaultCompany={defaultCompany}
        defaultDate={today}
      />
    </div>
  );
}
