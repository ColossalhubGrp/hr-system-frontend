import { Building } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCountries, listCurrencies } from "@/lib/frappe/masters/company";
import { NewCompanyForm } from "@/components/accounting/new-company-form";

export const metadata = { title: "New Company · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewCompanyPage() {
  const [countries, currencies] = await Promise.all([listCountries(), listCurrencies()]);
  return (
    <div className="flex flex-col gap-5">
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
