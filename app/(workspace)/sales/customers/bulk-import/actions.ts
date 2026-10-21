"use server";

import { runBulkImport, type BulkImportSummary } from "@/lib/frappe/bulk-import";
import { revalidatePath } from "next/cache";

export async function importCustomersAction(csvText: string): Promise<BulkImportSummary> {
  const res = await runBulkImport(csvText, {
    doctype: "Customer",
    columns: [
      { csvHeader: "customer_name",   fieldname: "customer_name",   required: true },
      { csvHeader: "customer_type",   fieldname: "customer_type" },
      { csvHeader: "customer_group",  fieldname: "customer_group" },
      { csvHeader: "territory",       fieldname: "territory" },
      { csvHeader: "tax_id",          fieldname: "tax_id" },
    ],
  });
  revalidatePath("/sales/customers");
  return res;
}
