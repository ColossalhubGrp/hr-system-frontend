import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Package, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getItem, listItemGroups, listUOMs } from "@/lib/frappe/item";
import { listCompanies } from "@/lib/frappe/accounting";
import { ItemForm } from "@/components/accounting/item-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return {
    title: `Edit ${decodeURIComponent(params.name)} · Item · Colossal HR`,
  };
}

export default async function EditItemPage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  const doc = await getItem(name);
  if (!doc) notFound();

  const [groups, uoms, companies] = await Promise.all([
    listItemGroups(),
    listUOMs(),
    listCompanies(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/accounting/items/${encodeURIComponent(name)}` as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to {doc.itemCode}
        </Link>
      </div>
      <PageHeader
        icon={Package}
        crumb={`Accounting · Items · ${doc.itemCode} · Edit`}
        title={`Edit ${doc.itemName}`}
        subtitle="Code can't change (it's the ledger reference). Everything else is editable."
      />
      <ItemForm
        itemGroups={groups}
        uoms={uoms}
        companies={companies}
        initial={{
          name: doc.name,
          itemCode: doc.itemCode,
          itemName: doc.itemName,
          itemGroup: doc.itemGroup,
          stockUom: doc.stockUom,
          standardRate: doc.standardRate,
          description: doc.description,
          image: doc.image,
          isStockItem: doc.isStockItem,
          isFixedAsset: doc.isFixedAsset,
          hasVariants: doc.hasVariants,
          hasBatchNo: doc.hasBatchNo,
          hasSerialNo: doc.hasSerialNo,
          openingStock: doc.openingStock,
          valuationRate: doc.valuationRate,
          shelfLifeInDays: doc.shelfLifeInDays,
          endOfLife: doc.endOfLife,
          weightPerUnit: doc.weightPerUnit,
          weightUom: doc.weightUom,
          disabled: doc.disabled,
          itemDefaults: doc.itemDefaults,
        }}
      />
    </div>
  );
}
