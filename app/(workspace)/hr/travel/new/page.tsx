import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Plane } from "lucide-react";
import { TravelForm } from "@/components/travel/travel-form";
import { listCurrencies } from "@/lib/frappe/lookups";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { createTravelRequestAction } from "../actions";

export const metadata = { title: "New travel request · Colossal HR" };

export default async function NewTravelPage() {
  const [currencies, options] = await Promise.all([
    listCurrencies(),
    fetchEmployeeFormOptions(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/travel" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to travel
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Plane className="h-3.5 w-3.5" />
          HR · Travel · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Request travel
        </h1>
      </header>
      <TravelForm
        action={createTravelRequestAction}
        employeeDirectory={options.employeeDirectory}
        currencies={currencies}
      />
    </div>
  );
}
