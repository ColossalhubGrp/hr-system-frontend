import { Coins } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { ModeOfPaymentForm } from "@/components/accounting/mode-of-payment-form";

export const metadata = { title: "New Mode of Payment · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewModeOfPaymentPage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];

  return (
    <div className="flex flex-col gap-5">
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
