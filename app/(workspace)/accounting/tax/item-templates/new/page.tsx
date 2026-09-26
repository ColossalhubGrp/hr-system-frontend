import { Percent, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { ItemTaxTemplateForm } from "@/components/accounting/item-tax-template-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Item Tax Template · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewItemTaxTemplatePage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/item-templates" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Item Tax Templates
        </Link>
      </div>
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
