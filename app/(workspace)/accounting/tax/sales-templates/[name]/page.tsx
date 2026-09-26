import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Percent, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { getSalesTaxTemplate } from "@/lib/frappe/tax/sales-template";
import { SalesTaxTemplateForm } from "@/components/accounting/sales-tax-template-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Sales Tax Template · Colossal HR` };
}

export default async function EditSalesTaxTemplatePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getSalesTaxTemplate(name), listCompanies()]);
  if (!doc) notFound();
  const accounts = await listAccounts(doc.company, { limit: 200 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/sales-templates" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Sales Tax Templates
        </Link>
      </div>
      <PageHeader icon={Percent} crumb={`Accounting · Tax · Sales Templates · ${doc.title}`} title={doc.title} subtitle={`${doc.company}${doc.isDefault ? " · Default" : ""}${doc.disabled ? " · Disabled" : ""}`} />
      <SalesTaxTemplateForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => ({ name: c.name }))}
        accounts={accounts}
        initial={{
          title: doc.title,
          company: doc.company,
          isDefault: doc.isDefault,
          disabled: doc.disabled,
          taxes: doc.taxes.map((t) => ({
            charge_type: t.chargeType,
            account_head: t.accountHead,
            description: t.description,
            rate: String(t.rate),
            cost_center: t.costCenter ?? "",
            included_in_print_rate: t.includedInPrintRate,
          })),
        }}
      />
    </div>
  );
}
