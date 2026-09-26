import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getTaxCategory } from "@/lib/frappe/tax/category";
import { TaxCategoryForm } from "@/components/accounting/tax-category-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Tax Category · Colossal HR` };
}

export default async function EditTaxCategoryPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getTaxCategory(name);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/categories" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Tax Categories
        </Link>
      </div>
      <PageHeader icon={Layers} crumb={`Accounting · Tax · Categories · ${doc.title}`} title={doc.title} subtitle={doc.disabled ? "Disabled" : "Active"} />
      <TaxCategoryForm mode="edit" name={doc.name} initial={{ title: doc.title, disabled: doc.disabled }} />
    </div>
  );
}
