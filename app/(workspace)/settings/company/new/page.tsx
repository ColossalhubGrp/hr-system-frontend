import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Building2 } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import {
  listCountries,
  listCurrencies,
  listHolidayLists,
} from "@/lib/frappe/companies";
import { CompanyForm } from "@/components/settings/company-form";
import { createCompanyAction } from "../actions";

export const metadata = {
  title: "New company · Settings · Colossal HR",
};

export default async function NewCompanyPage() {
  await requireGroup("HR_ADMIN", "/settings/company/new");
  const [countries, currencies, holidayLists] = await Promise.all([
    listCountries(),
    listCurrencies(),
    listHolidayLists(),
  ]);

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
          Settings · Company · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Create a new company
        </h1>
        <p className="text-sm text-ash-600">
          Name + abbreviation + country + currency are required. Everything
          else can be filled in later.
        </p>
      </header>

      <CompanyForm
        mode="create"
        action={createCompanyAction}
        cancelHref="/settings/company"
        countries={countries}
        currencies={currencies}
        holidayLists={holidayLists}
      />
    </div>
  );
}
