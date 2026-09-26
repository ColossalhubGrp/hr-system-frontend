import { Percent } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { ItemTaxTemplateForm } from "@/components/accounting/item-tax-template-form";

export const metadata = { title: "New Item Tax Template · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewItemTaxTemplatePage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Percent}
        crumb="Accounting · Tax · Item Tax Templates · New"
        title="New Item Tax Template"
        subtitle="A per-item override for the sales/purchase tax rate on invoice lines."
      />
      <ItemTaxTemplateForm mode="create" companies={companies.map((c) => ({ name: c.name }))} accounts={accounts} />
    </div>
  );
}
