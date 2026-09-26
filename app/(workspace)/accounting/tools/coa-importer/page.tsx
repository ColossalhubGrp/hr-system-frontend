import Link from "next/link";
import type { Route } from "next";
import { FileInput, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { CoaImporterForm } from "@/components/accounting/coa-importer-form";

export const metadata = { title: "Chart of Accounts Importer · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function CoaImporterPage() {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={FileInput}
        crumb="Accounting · Tools · Chart of Accounts Importer"
        title="Chart of Accounts Importer"
        subtitle="Upload a CSV or JSON to seed the whole account hierarchy in one shot."
      />
      <CoaImporterForm companies={companies.map((c) => c.name)} />
    </div>
  );
}
