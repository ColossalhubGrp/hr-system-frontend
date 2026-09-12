import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Wallet } from "lucide-react";
import { AdvanceForm } from "@/components/finance/advance-form";
import { listCurrencies } from "@/lib/frappe/lookups";
import { listModesOfPayment } from "@/lib/frappe/expense-claims";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { createEmployeeAdvanceAction } from "../actions";

export const metadata = { title: "New advance · Colossal HR" };

export default async function NewAdvancePage() {
  const [currencies, modes, options] = await Promise.all([
    listCurrencies(),
    listModesOfPayment(),
    fetchEmployeeFormOptions(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/employee-advances" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to advances
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Wallet className="h-3.5 w-3.5" />
          HR · Advances · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Create an employee advance
        </h1>
      </header>
      <AdvanceForm
        action={createEmployeeAdvanceAction}
        employeeDirectory={options.employeeDirectory}
        currencies={currencies}
        modesOfPayment={modes}
      />
    </div>
  );
}
