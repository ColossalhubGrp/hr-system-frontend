import { Calculator } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listFiscalYears } from "@/lib/frappe/masters/fiscal-year";
import { listMonthlyDistributions } from "@/lib/frappe/budgets/monthly-distribution";
import { BudgetForm } from "@/components/accounting/budget-form";

export const metadata = { title: "New Budget · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewBudgetPage() {
  const [companies, fys, mds] = await Promise.all([listCompanies(), listFiscalYears(), listMonthlyDistributions()]);
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 200 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Calculator}
        crumb="Accounting · Budgets · New"
        title="New Budget"
        subtitle="Cap spending against an account, per Cost Center / Project / Dimension for a fiscal year."
      />
      <BudgetForm
        mode="create"
        companies={companies.map((c) => ({ name: c.name }))}
        fiscalYears={fys.map((y) => y.name)}
        accounts={accounts}
        monthlyDistributions={mds.map((m) => m.name)}
      />
    </div>
  );
}
