import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import { CsvImportForm } from "@/components/common/csv-import-form";
import { importCustomersAction } from "./actions";

export const metadata = { title: "Bulk import customers · Sales · Colossal Suite" };

const HEADER = ["customer_name", "customer_type", "customer_group", "territory", "tax_id"];
const SAMPLE: string[][] = [
  ["Chikomba Enterprises", "Company", "Commercial", "Zimbabwe", "ZIMRA-123456"],
  ["Grace Moyo", "Individual", "Individual", "Zimbabwe", ""],
];

export default function CustomerBulkImportPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href={"/sales/customers" as Route} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Customers
      </Link>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">— Sales</div>
        <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-foreground">Bulk import customers</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Upload a CSV to add many customers at once. Each row becomes one Customer record.
        </p>
      </div>
      <CsvImportForm
        entityLabel="Customers"
        templateHeader={HEADER}
        sampleRows={SAMPLE}
        importAction={importCustomersAction}
      />
    </div>
  );
}
