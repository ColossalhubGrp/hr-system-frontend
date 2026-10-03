import Link from "next/link";
import type { Route } from "next";
import { Package, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listItemGroups, listUOMs } from "@/lib/frappe/item";
import { listCompanies } from "@/lib/frappe/accounting";
import { ItemForm } from "@/components/accounting/item-form";

export const metadata = { title: "New Item · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const [groups, uoms, companies] = await Promise.all([
    listItemGroups(),
    listUOMs(),
    listCompanies(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={"/accounting/items" as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Items
        </Link>
      </div>
      <PageHeader
        icon={Package}
        crumb="Accounting · Items · New"
        title="New Item"
        subtitle="A product or service that can be billed on invoices and tracked in stock."
      />
      <ItemForm itemGroups={groups} uoms={uoms} companies={companies} />
    </div>
  );
}
