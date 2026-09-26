import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { NewRevaluationForm } from "@/components/accounting/new-revaluation-form";

export const metadata = { title: "New Exchange Rate Revaluation · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewRevaluationPage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={RefreshCw}
        crumb="Accounting · Multi-Currency · Revaluation · New"
        title="New Exchange Rate Revaluation"
        subtitle="Recognize FX gain/loss on foreign-currency balances at period end."
      />
      <NewRevaluationForm companies={companies.map((c) => c.name)} accounts={accounts} defaultDate={today} />
    </div>
  );
}
