"use server";

import { runBulkImport, type BulkImportSummary } from "@/lib/frappe/bulk-import";
import { revalidatePath } from "next/cache";

export async function importItemsAction(csvText: string): Promise<BulkImportSummary> {
  const res = await runBulkImport(csvText, {
    doctype: "Item",
    columns: [
      { csvHeader: "item_code",      fieldname: "item_code",     required: true },
      { csvHeader: "item_name",      fieldname: "item_name",     required: true },
      { csvHeader: "item_group",     fieldname: "item_group",    required: true },
      { csvHeader: "stock_uom",      fieldname: "stock_uom",     required: true },
      { csvHeader: "standard_rate",  fieldname: "standard_rate", coerce: "number" },
      { csvHeader: "is_stock_item",  fieldname: "is_stock_item", coerce: "boolean" },
    ],
  });
  revalidatePath("/accounting/items");
  return res;
}
