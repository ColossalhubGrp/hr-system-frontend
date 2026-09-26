import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Calculator, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listFiscalYears } from "@/lib/frappe/masters/fiscal-year";
import { listMonthlyDistributions } from "@/lib/frappe/budgets/monthly-distribution";
import { getBudget } from "@/lib/frappe/budgets/budget";
import { BudgetForm } from "@/components/accounting/budget-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Budget · Colossal HR` };
}

export default async function EditBudgetPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies, fys, mds] = await Promise.all([
    getBudget(name),
    listCompanies(),
    listFiscalYears(),
    listMonthlyDistributions(),
  ]);
  if (!doc) notFound();
  const accounts = await listAccounts(doc.company, { limit: 200 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/budgets" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Budgets
        </Link>
      </div>
      <PageHeader icon={Calculator} crumb={`Accounting · Budgets · ${doc.name}`} title={doc.name} subtitle={`${doc.budgetAgainst}: ${doc.costCenter ?? doc.project ?? doc.accountingDimension ?? "—"} · ${doc.fiscalYear}`} />
      <BudgetForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => ({ name: c.name }))}
        fiscalYears={fys.map((y) => y.name)}
        accounts={accounts}
        monthlyDistributions={mds.map((m) => m.name)}
        initial={{
          budgetAgainst: doc.budgetAgainst,
          company: doc.company,
          fiscalYear: doc.fiscalYear,
          costCenter: doc.costCenter,
          project: doc.project,
          accountingDimension: doc.accountingDimension,
          monthlyDistribution: doc.monthlyDistribution,
          applicableOnMaterialRequest: doc.applicableOnMaterialRequest,
          applicableOnPurchaseOrder: doc.applicableOnPurchaseOrder,
          applicableOnBookingActualExpenses: doc.applicableOnBookingActualExpenses,
          actionIfAnnualBudgetExceeded: doc.actionIfAnnualBudgetExceeded,
          actionIfAnnualBudgetExceededOnMr: doc.actionIfAnnualBudgetExceededOnMr,
          actionIfAnnualBudgetExceededOnPo: doc.actionIfAnnualBudgetExceededOnPo,
          actionIfAccumulatedMonthlyBudgetExceeded: doc.actionIfAccumulatedMonthlyBudgetExceeded,
          actionIfAccumulatedMonthlyBudgetExceededOnMr: doc.actionIfAccumulatedMonthlyBudgetExceededOnMr,
          actionIfAccumulatedMonthlyBudgetExceededOnPo: doc.actionIfAccumulatedMonthlyBudgetExceededOnPo,
          accounts: doc.accounts.map((a) => ({ account: a.account, budget_amount: String(a.budgetAmount) })),
        }}
      />
    </div>
  );
}
