import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { PieChart, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { getCostCenterAllocation } from "@/lib/frappe/budgets/cost-center-allocation";
import { CostCenterAllocationForm } from "@/components/accounting/cost-center-allocation-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Allocation · Colossal HR` };
}

export default async function EditAllocationPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getCostCenterAllocation(name), listCompanies()]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/cost-centers/allocations" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Allocations
        </Link>
      </div>
      <PageHeader icon={PieChart} crumb={`Accounting · Cost Centers · Allocations · ${doc.name}`} title={doc.name} subtitle={`${doc.mainCostCenter} · ${doc.validFrom} · ${doc.company}`} />
      <CostCenterAllocationForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => ({ name: c.name }))}
        initial={{
          company: doc.company,
          mainCostCenter: doc.mainCostCenter,
          validFrom: doc.validFrom,
          percentages: doc.percentages.map((p) => ({ cost_center: p.costCenter, percentage: String(p.percentage) })),
        }}
      />
    </div>
  );
}
