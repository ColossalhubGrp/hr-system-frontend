import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { TaxCategoryForm } from "@/components/accounting/tax-category-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Tax Category · Colossal HR" };

export default function NewTaxCategoryPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/categories" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Tax Categories
        </Link>
      </div>
      <PageHeader
        icon={Layers}
        crumb="Accounting · Tax · Categories · New"
        title="New Tax Category"
        subtitle="A bucket that Tax Rules use to pick the right template per party or region."
      />
      <TaxCategoryForm mode="create" />
    </div>
  );
}
