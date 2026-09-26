import { Percent } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { SalesTaxTemplateForm } from "@/components/accounting/sales-tax-template-form";

export const metadata = { title: "New Sales Tax Template · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewSalesTaxTemplatePage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Percent}
        crumb="Accounting · Tax · Sales Templates · New"
        title="New Sales Taxes and Charges Template"
        subtitle="A reusable tax block applied to Sales Invoices, Quotes and Sales Orders."
      />
      <SalesTaxTemplateForm mode="create" companies={companies.map((c) => ({ name: c.name }))} accounts={accounts} />
    </div>
  );
}
