import { Building, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCountries, listCurrencies } from "@/lib/frappe/masters/company";
import { NewCompanyForm } from "@/components/accounting/new-company-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Company · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewCompanyPage() {
  const [countries, currencies] = await Promise.all([listCountries(), listCurrencies()]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/companies" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Companies
        </Link>
      </div>
      <PageHeader
        icon={Building}
        crumb="Accounting · Masters · Companies · New"
        title="New Company"
        subtitle="A new operating entity. The Chart of Accounts is seeded automatically from the template you pick."
      />
      <NewCompanyForm countries={countries} currencies={currencies} />
    </div>
  );
}
