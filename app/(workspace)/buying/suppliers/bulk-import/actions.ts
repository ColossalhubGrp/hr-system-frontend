"use server";

import { runBulkImport, type BulkImportSummary } from "@/lib/frappe/bulk-import";
import { revalidatePath } from "next/cache";

export async function importSuppliersAction(csvText: string): Promise<BulkImportSummary> {
  const res = await runBulkImport(csvText, {
    doctype: "Supplier",
    columns: [
      { csvHeader: "supplier_name",   fieldname: "supplier_name",   required: true },
      { csvHeader: "supplier_type",   fieldname: "supplier_type" },
      { csvHeader: "supplier_group",  fieldname: "supplier_group" },
      { csvHeader: "country",         fieldname: "country" },
      { csvHeader: "tax_id",          fieldname: "tax_id" },
    ],
  });
  revalidatePath("/buying/suppliers");
  return res;
}
