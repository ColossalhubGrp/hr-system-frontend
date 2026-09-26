import { Coins, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { ModeOfPaymentForm } from "@/components/accounting/mode-of-payment-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Mode of Payment · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewModeOfPaymentPage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/modes-of-payment" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Modes of Payment
        </Link>
      </div>
      <PageHeader
        icon={Coins}
        crumb="Accounting · Masters · Modes of Payment · New"
        title="New Mode of Payment"
        subtitle="Add a new payment method — the label users see when picking how money moved."
      />
      <ModeOfPaymentForm mode="create" companies={companies} accounts={accounts} />
    </div>
  );
}
