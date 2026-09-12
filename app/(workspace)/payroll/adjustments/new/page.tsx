import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, CircleDollarSign } from "lucide-react";
import {
  AdditionalSalaryForm,
  SimpleWrapperForm,
} from "@/components/pay-adjustments/additional-salary-form";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { listCompanies, listCurrencies } from "@/lib/frappe/lookups";
import { listSalaryComponents } from "@/lib/frappe/pay-adjustments";
import {
  createAdditionalSalaryAction,
  createIncentiveAction,
  createRetentionBonusAction,
} from "../actions";

export const metadata = { title: "New pay adjustment · Colossal HR" };

export default async function NewAdjustmentPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const type: "additional" | "retention" | "incentive" =
    searchParams.type === "retention" || searchParams.type === "incentive"
      ? searchParams.type
      : "additional";
  const [options, companies, currencies, earnings] = await Promise.all([
    fetchEmployeeFormOptions(),
    listCompanies(),
    listCurrencies(),
    listSalaryComponents({ type: type === "additional" ? undefined : "Earning" }),
  ]);
  const componentNames = earnings.map((c) => c.name);
  const backHref =
    type === "additional"
      ? "/payroll/adjustments"
      : `/payroll/adjustments?tab=${type}`;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to adjustments
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <CircleDollarSign className="h-3.5 w-3.5" />
          Payroll · Adjustments · New{" "}
          {type === "additional"
            ? "adjustment"
            : type === "retention"
              ? "retention bonus"
              : "incentive"}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {type === "additional"
            ? "Create an additional salary"
            : type === "retention"
              ? "Create a retention bonus"
              : "Create an employee incentive"}
        </h1>
      </header>

      {type === "additional" ? (
        <AdditionalSalaryForm
          action={createAdditionalSalaryAction}
          employeeDirectory={options.employeeDirectory}
          components={componentNames}
          currencies={currencies}
          companies={companies}
        />
      ) : (
        <SimpleWrapperForm
          kind={type}
          action={
            type === "retention" ? createRetentionBonusAction : createIncentiveAction
          }
          employeeDirectory={options.employeeDirectory}
          components={componentNames}
          companies={companies}
        />
      )}
    </div>
  );
}
