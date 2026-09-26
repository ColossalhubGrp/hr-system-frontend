import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Percent, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { getPurchaseTaxTemplate } from "@/lib/frappe/tax/purchase-template";
import { PurchaseTaxTemplateForm } from "@/components/accounting/purchase-tax-template-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Purchase Tax Template · Colossal HR` };
}

export default async function EditPurchaseTaxTemplatePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getPurchaseTaxTemplate(name), listCompanies()]);
  if (!doc) notFound();
  const accounts = await listAccounts(doc.company, { limit: 200 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/purchase-templates" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Purchase Tax Templates
        </Link>
      </div>
      <PageHeader icon={Percent} crumb={`Accounting · Tax · Purchase Templates · ${doc.title}`} title={doc.title} subtitle={`${doc.company}${doc.isDefault ? " · Default" : ""}${doc.disabled ? " · Disabled" : ""}`} />
      <PurchaseTaxTemplateForm
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
            category: t.category,
            add_deduct_tax: t.addDeductTax,
            cost_center: t.costCenter ?? "",
            included_in_print_rate: t.includedInPrintRate,
          })),
        }}
      />
    </div>
  );
}
