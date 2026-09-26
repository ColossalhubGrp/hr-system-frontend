import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ClipboardList, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listTaxCategories } from "@/lib/frappe/tax/category";
import { listSalesTaxTemplates } from "@/lib/frappe/tax/sales-template";
import { listPurchaseTaxTemplates } from "@/lib/frappe/tax/purchase-template";
import { getTaxRule } from "@/lib/frappe/tax/rule";
import { TaxRuleForm } from "@/components/accounting/tax-rule-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Tax Rule · Colossal HR` };
}

export default async function EditTaxRulePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, cats, sales, purch] = await Promise.all([
    getTaxRule(name),
    listTaxCategories(),
    listSalesTaxTemplates(),
    listPurchaseTaxTemplates(),
  ]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/rules" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Tax Rules
        </Link>
      </div>
      <PageHeader icon={ClipboardList} crumb={`Accounting · Tax · Rules · ${doc.name}`} title={doc.name} subtitle={`${doc.taxType} · priority ${doc.priority}`} />
      <TaxRuleForm
        mode="edit"
        name={doc.name}
        salesTemplates={sales.map((s) => s.name)}
        purchaseTemplates={purch.map((p) => p.name)}
        categories={cats.map((c) => c.title)}
        initial={doc}
      />
    </div>
  );
}
