import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Receipt } from "lucide-react";
import { ExpenseClaimForm } from "@/components/expense/expense-form";
import { listExpenseTypes } from "@/lib/frappe/expense-claims";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { createExpenseClaimAction } from "../actions";

export const metadata = { title: "New expense claim · Colossal HR" };

export default async function NewExpenseClaimPage() {
  const [expenseTypes, options] = await Promise.all([
    listExpenseTypes(),
    fetchEmployeeFormOptions(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={"/hr/expense-claims" as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to claims
        </Link>
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Receipt className="h-3.5 w-3.5" />
          HR · Expense Claims · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          File an expense claim
        </h1>
        <p className="text-sm text-ash-600">
          Add one expense line for now — multi-line claims arrive in a follow-up.
        </p>
      </header>

      <ExpenseClaimForm
        action={createExpenseClaimAction}
        companies={options.companies}
        expenseTypes={expenseTypes}
      />
    </div>
  );
}
