import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DimensionForm } from "@/components/accounting/dimension-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Accounting Dimension · Colossal HR" };

export default function NewDimensionPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/dimensions" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting Dimensions
        </Link>
      </div>
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
