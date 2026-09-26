import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Percent, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { getItemTaxTemplate } from "@/lib/frappe/tax/item-template";
import { ItemTaxTemplateForm } from "@/components/accounting/item-tax-template-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Item Tax Template · Colossal HR` };
}

export default async function EditItemTaxTemplatePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getItemTaxTemplate(name), listCompanies()]);
  if (!doc) notFound();
  const accounts = await listAccounts(doc.company, { limit: 200 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/item-templates" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Item Tax Templates
        </Link>
      </div>
      <PageHeader icon={Percent} crumb={`Accounting · Tax · Item Tax Templates · ${doc.title}`} title={doc.title} subtitle={`${doc.company}${doc.disabled ? " · Disabled" : ""}`} />
      <ItemTaxTemplateForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => ({ name: c.name }))}
        accounts={accounts}
        initial={{
          title: doc.title,
          company: doc.company,
          disabled: doc.disabled,
          taxes: doc.taxes.map((t) => ({ tax_type: t.taxType, tax_rate: String(t.taxRate) })),
        }}
      />
    </div>
  );
}
