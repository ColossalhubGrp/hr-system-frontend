import { PieChart } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { CostCenterAllocationForm } from "@/components/accounting/cost-center-allocation-form";

export const metadata = { title: "New Cost Center Allocation · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewAllocationPage() {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
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
