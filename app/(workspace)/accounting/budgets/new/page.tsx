import { Calculator, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listFiscalYears } from "@/lib/frappe/masters/fiscal-year";
import { listMonthlyDistributions } from "@/lib/frappe/budgets/monthly-distribution";
import { BudgetForm } from "@/components/accounting/budget-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Budget · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewBudgetPage() {
  const [companies, fys, mds] = await Promise.all([listCompanies(), listFiscalYears(), listMonthlyDistributions()]);
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 200 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/budgets" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Budgets
        </Link>
      </div>
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
