import { BarChart3, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listFiscalYears } from "@/lib/frappe/masters/fiscal-year";
import { MonthlyDistributionForm } from "@/components/accounting/monthly-distribution-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Monthly Distribution · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewMonthlyDistributionPage() {
  const fys = await listFiscalYears();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/monthly-distribution" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Monthly Distribution
        </Link>
      </div>
      <PageHeader
        icon={BarChart3}
        crumb="Accounting · Masters · Monthly Distribution · New"
        title="New Monthly Distribution"
        subtitle="How a budget or target gets split across the 12 months of the year."
      />
      <MonthlyDistributionForm mode="create" fiscalYears={fys.map((y) => y.name)} />
    </div>
  );
}
