import { Percent, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { PurchaseTaxTemplateForm } from "@/components/accounting/purchase-tax-template-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Purchase Tax Template · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewPurchaseTaxTemplatePage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/purchase-templates" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Purchase Tax Templates
        </Link>
      </div>
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
