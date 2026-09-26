import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { BarChart3, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listFiscalYears } from "@/lib/frappe/masters/fiscal-year";
import { getMonthlyDistribution } from "@/lib/frappe/budgets/monthly-distribution";
import { MonthlyDistributionForm } from "@/components/accounting/monthly-distribution-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Monthly Distribution · Colossal HR` };
}

export default async function EditMonthlyDistributionPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, fys] = await Promise.all([getMonthlyDistribution(name), listFiscalYears()]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/monthly-distribution" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Monthly Distribution
        </Link>
      </div>
      <PageHeader icon={BarChart3} crumb={`Accounting · Masters · Monthly Distribution · ${doc.distributionId}`} title={doc.distributionId} subtitle={doc.fiscalYear ?? ""} />
      <MonthlyDistributionForm
        mode="edit"
        name={doc.name}
        fiscalYears={fys.map((y) => y.name)}
        initial={{
          fiscalYear: doc.fiscalYear,
          percentages: doc.percentages.map((p) => ({ month: p.month, percentage_allocation: String(p.percentageAllocation) })),
        }}
      />
    </div>
  );
}
