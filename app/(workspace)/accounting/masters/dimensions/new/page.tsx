import { Layers } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DimensionForm } from "@/components/accounting/dimension-form";

export const metadata = { title: "New Accounting Dimension · Colossal HR" };

export default function NewDimensionPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Layers}
        crumb="Accounting · Masters · Accounting Dimensions · New"
        title="New Accounting Dimension"
        subtitle="An extra tag GL entries carry alongside Account + Cost Center."
      />
      <DimensionForm mode="create" />
    </div>
  );
}
