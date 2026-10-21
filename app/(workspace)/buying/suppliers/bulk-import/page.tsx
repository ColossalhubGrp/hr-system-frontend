import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import { CsvImportForm } from "@/components/common/csv-import-form";
import { importSuppliersAction } from "./actions";

export const metadata = { title: "Bulk import suppliers · Buying · Colossal ERP" };

const HEADER = ["supplier_name", "supplier_type", "supplier_group", "country", "tax_id"];
const SAMPLE: string[][] = [
  ["Harare Office Supplies", "Company", "Services", "Zimbabwe", "ZIMRA-999777"],
  ["CBZ Bank Ltd", "Company", "Services", "Zimbabwe", ""],
];

export default function SupplierBulkImportPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href={"/buying/suppliers" as Route} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Suppliers
      </Link>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">— Buying</div>
        <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-foreground">Bulk import suppliers</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Upload a CSV to add many suppliers at once. Each row becomes one Supplier record.
        </p>
      </div>
      <CsvImportForm
        entityLabel="Suppliers"
        templateHeader={HEADER}
        sampleRows={SAMPLE}
        importAction={importSuppliersAction}
      />
    </div>
  );
}
