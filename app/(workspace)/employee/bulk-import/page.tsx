import { requireGroup } from "@/lib/frappe/require-role";
import { BulkImportForm } from "./bulk-import-form";

export const metadata = { title: "Bulk hire · Employees · Colossal Hub" };
export const dynamic = "force-dynamic";

export default async function BulkImportPage() {
  await requireGroup("HR_ANY");
  return <BulkImportForm />;
}
