import { Percent } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { PurchaseTaxTemplateForm } from "@/components/accounting/purchase-tax-template-form";

export const metadata = { title: "New Purchase Tax Template · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewPurchaseTaxTemplatePage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Percent}
        crumb="Accounting · Tax · Purchase Templates · New"
        title="New Purchase Taxes and Charges Template"
        subtitle="A reusable tax block applied to Purchase Invoices, POs and RFQs."
      />
      <PurchaseTaxTemplateForm mode="create" companies={companies.map((c) => ({ name: c.name }))} accounts={accounts} />
    </div>
  );
}
