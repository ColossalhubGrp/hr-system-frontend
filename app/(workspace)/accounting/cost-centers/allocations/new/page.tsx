import { PieChart, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { CostCenterAllocationForm } from "@/components/accounting/cost-center-allocation-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Cost Center Allocation · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewAllocationPage() {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/cost-centers/allocations" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Cost Center Allocations
        </Link>
      </div>
      <PageHeader
        icon={PieChart}
        crumb="Accounting · Cost Centers · Allocations · New"
        title="New Cost Center Allocation"
        subtitle="Route a main cost centre's postings to sub-centres by percentage."
      />
      <CostCenterAllocationForm mode="create" companies={companies.map((c) => ({ name: c.name }))} />
    </div>
  );
}
