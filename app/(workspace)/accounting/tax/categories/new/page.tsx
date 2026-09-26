import { Layers } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { TaxCategoryForm } from "@/components/accounting/tax-category-form";

export const metadata = { title: "New Tax Category · Colossal HR" };

export default function NewTaxCategoryPage() {
  return (
    <div className="flex flex-col gap-5">
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
