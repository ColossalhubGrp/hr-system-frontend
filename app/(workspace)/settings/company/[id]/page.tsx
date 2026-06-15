import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Building2 } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import {
  getCompany,
  listCountries,
  listCurrencies,
  listHolidayLists,
} from "@/lib/frappe/companies";
import { CompanyForm } from "@/components/settings/company-form";
import { updateCompanyAction } from "../actions";

export const metadata = {
  title: "Edit company · Settings · Colossal HR",
};

export default async function CompanyEditPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  await requireGroup("HR_ADMIN", `/settings/company/${id}`);
  const [company, countries, currencies, holidayLists] = await Promise.all([
    getCompany(id),
    listCountries(),
    listCurrencies(),
    listHolidayLists(),
  ]);
  if (!company) notFound();
  const action = updateCompanyAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings/company" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to companies
      </Link>
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Building2 className="h-3.5 w-3.5" />
          Settings · Company · {company.id}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {company.companyName}
        </h1>
        <p className="text-sm text-ash-600">
          {company.abbr} · {company.country ?? "—"} · {company.defaultCurrency ?? "—"}
        </p>
      </header>

      <CompanyForm
        mode="edit"
        action={action}
        cancelHref="/settings/company"
        countries={countries}
        currencies={currencies}
        holidayLists={holidayLists}
        initial={company}
      />
    </div>
  );
}
