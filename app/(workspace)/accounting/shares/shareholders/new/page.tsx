import { Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { ShareholderForm } from "@/components/accounting/shareholder-form";

export const metadata = { title: "New Shareholder · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewShareholderPage() {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Users}
        crumb="Accounting · Shares · Shareholders · New"
        title="New Shareholder"
        subtitle="Add a name to the register."
      />
      <ShareholderForm mode="create" companies={companies.map((c) => c.name)} />
    </div>
  );
}
