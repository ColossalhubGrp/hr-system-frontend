import { ClipboardList, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listTaxCategories } from "@/lib/frappe/tax/category";
import { listSalesTaxTemplates } from "@/lib/frappe/tax/sales-template";
import { listPurchaseTaxTemplates } from "@/lib/frappe/tax/purchase-template";
import { TaxRuleForm } from "@/components/accounting/tax-rule-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Tax Rule · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewTaxRulePage() {
  const [cats, sales, purch] = await Promise.all([listTaxCategories(), listSalesTaxTemplates(), listPurchaseTaxTemplates()]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/rules" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Tax Rules
        </Link>
      </div>
      <PageHeader
        icon={ClipboardList}
        crumb="Accounting · Tax · Rules · New"
        title="New Tax Rule"
        subtitle="A router that picks the right tax template based on party, item, category or geography."
      />
      <TaxRuleForm
        mode="create"
        salesTemplates={sales.map((s) => s.name)}
        purchaseTemplates={purch.map((p) => p.name)}
        categories={cats.map((c) => c.title)}
      />
    </div>
  );
}
