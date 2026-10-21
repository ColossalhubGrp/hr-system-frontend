import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import { CsvImportForm } from "@/components/common/csv-import-form";
import { importItemsAction } from "./actions";

export const metadata = { title: "Bulk import items · Accounting · Colossal ERP" };

const HEADER = ["item_code", "item_name", "item_group", "stock_uom", "standard_rate", "is_stock_item"];
const SAMPLE: string[][] = [
  ["ITEM-001", "Printer Paper A4", "Office Supplies", "Pack", "4.50", "1"],
  ["SRV-CONSULT", "Hourly Consulting", "Services", "Hour", "75.00", "0"],
];

export default function ItemBulkImportPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href={"/accounting/items" as Route} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Items
      </Link>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">— Accounting</div>
        <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-foreground">Bulk import items</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Upload a CSV to add many items at once. Each row becomes one Item record.
        </p>
      </div>
      <CsvImportForm
        entityLabel="Items"
        templateHeader={HEADER}
        sampleRows={SAMPLE}
        importAction={importItemsAction}
      />
    </div>
  );
}
