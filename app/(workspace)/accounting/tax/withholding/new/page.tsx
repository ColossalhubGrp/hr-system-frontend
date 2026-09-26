import { BadgeDollarSign, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { TaxWithholdingForm } from "@/components/accounting/tax-withholding-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Tax Withholding Category · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewTaxWithholdingPage() {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tax/withholding" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Tax Withholding
        </Link>
      </div>
      <PageHeader
        icon={BadgeDollarSign}
        crumb="Accounting · Tax · Withholding · New"
        title="New Tax Withholding Category"
        subtitle="A WHT/TDS bucket with per-period rates, thresholds and per-company GL accounts."
      />
      <TaxWithholdingForm mode="create" companies={companies.map((c) => ({ name: c.name }))} />
    </div>
  );
}
