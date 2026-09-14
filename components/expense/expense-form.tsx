"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Send } from "lucide-react";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import { ChildTableEditor } from "@/components/employee/child-table-editor";
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import { ApproverPickerField } from "@/components/common/approver-picker-field";
import { SetupExpenseAccountsButton } from "@/components/expense/setup-accounts-button";
import type { FormState } from "@/app/(workspace)/hr/expense-claims/actions";
import { cn } from "@/lib/cn";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export type AccountOption = { value: string; label: string };
/** Accounts keyed by company. Empty array (or missing company) → the
 *  company's chart of accounts isn't set up in ERPNext yet; UI shows a
 *  hint instead of a select. */
export type OptionsByCompany = Record<string, AccountOption[]>;

export function ExpenseClaimForm({
  action,
  companies,
  defaultCompany,
  expenseTypes,
  employeeDirectory,
  payableAccountsByCompany,
  costCentersByCompany,
  modesOfPayment,
}: {
  action: Action;
  companies: string[];
  /** Resolved from the signed-in user's Employee.company (or User default,
   *  or the global default). Used to pre-fill the Company picker so HR
   *  doesn't have to pick their own company every time. When there's
   *  only one company, the picker is hidden and this value is submitted
   *  via a hidden input. */
  defaultCompany?: string;
  expenseTypes: string[];
  employeeDirectory: EmployeeDirectoryEntry[];
  payableAccountsByCompany: OptionsByCompany;
  costCentersByCompany: OptionsByCompany;
  modesOfPayment: string[];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  // Company drives which accounts + cost centers appear in the pickers
  // below. Start from the user's default (Employee.company etc.) and
  // fall back to the first company if that isn't available.
  const initialCompany =
    (defaultCompany && companies.includes(defaultCompany) && defaultCompany) ||
    companies[0] ||
    "";
  const [company, setCompany] = useState<string>(initialCompany);
  const hideCompanyPicker = companies.length <= 1;
  const [isPaid, setIsPaid] = useState<boolean>(false);

  const payableAccounts = useMemo(
    () => (company ? payableAccountsByCompany[company] ?? [] : []),
    [company, payableAccountsByCompany],
  );
  const costCenters = useMemo(
    () => (company ? costCentersByCompany[company] ?? [] : []),
    [company, costCentersByCompany],
  );

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}

      <FormSection title="Claim">
        <EmployeePickerField
          name="employee"
          required
          error={fe.employee}
          directory={employeeDirectory}
        />
        {hideCompanyPicker ? (
          <input type="hidden" name="company" value={company} />
        ) : (
          <Field label="Company" htmlFor="company" required error={fe.company}>
            <SelectInput
              id="company"
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              options={companies}
              placeholder="Select company"
              invalid={Boolean(fe.company)}
            />
          </Field>
        )}
        <Field
          label="Posting date"
          htmlFor="posting_date"
          required
          error={fe.posting_date}
        >
          <TextInput
            id="posting_date"
            name="posting_date"
            type="date"
            invalid={Boolean(fe.posting_date)}
          />
        </Field>
        <ApproverPickerField
          name="approver"
          error={fe.approver}
          directory={employeeDirectory}
        />
        <Field label="Remarks" htmlFor="remark" wide>
          <TextArea id="remark" name="remark" rows={2} />
        </Field>
      </FormSection>

      <FormSection
        title="Expense lines"
        description="Add one row per expense. Date, type and amount are required on every row."
      >
        <div className="col-span-full">
          {fe.expenses && (
            <p
              role="alert"
              className="mb-3 rounded-md border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
            >
              {fe.expenses}
            </p>
          )}
          <ChildTableEditor
            name="expenses_json"
            addLabel="Add expense line"
            emptyLabel="No lines yet — click Add expense line to start."
            initial={[
              { expense_date: "", expense_type: "", description: "", amount: null },
            ]}
            emptyRow={() => ({
              expense_date: "",
              expense_type: "",
              description: "",
              amount: null,
            })}
            fields={[
              {
                key: "expense_date",
                label: "Date",
                type: "date",
                required: true,
              },
              {
                key: "expense_type",
                label: "Type",
                type: "select",
                options: expenseTypes,
                required: true,
              },
              {
                key: "amount",
                label: "Amount",
                type: "number",
                min: 0,
                step: 0.01,
                required: true,
                placeholder: "0.00",
              },
              {
                key: "description",
                label: "Description",
                placeholder: "Optional",
              },
            ]}
            serialize={(r) => ({
              expense_date: r.expense_date || "",
              expense_type: r.expense_type || "",
              description: r.description || "",
              amount: r.amount == null || r.amount === "" ? 0 : Number(r.amount),
            })}
          />
        </div>
      </FormSection>

      <FormSection
        title="Accounting"
        description={
          "Optional at this stage. HR can also fill these in later, before approving."
        }
      >
        <Field
          label="Payable account"
          htmlFor="payable_account"
          error={fe.payable_account}
          hint={
            company && payableAccounts.length === 0
              ? `${company} has no Chart of Accounts yet — this is a one-off setup step per company.`
              : undefined
          }
        >
          <SelectInput
            id="payable_account"
            name="payable_account"
            options={payableAccounts.map((a) => ({ value: a.value, label: a.label }))}
            placeholder={payableAccounts.length ? "Use company default" : "—"}
            invalid={Boolean(fe.payable_account)}
          />
          {company && payableAccounts.length === 0 && (
            <SetupExpenseAccountsButton company={company} />
          )}
        </Field>
        <Field
          label="Cost center"
          htmlFor="cost_center"
          error={fe.cost_center}
        >
          <SelectInput
            id="cost_center"
            name="cost_center"
            options={costCenters.map((c) => ({ value: c.value, label: c.label }))}
            placeholder={costCenters.length ? "Use company default" : "—"}
            invalid={Boolean(fe.cost_center)}
          />
        </Field>
        <Field label="Paid on filing?" htmlFor="is_paid">
          <label className="flex h-10 items-center gap-2 rounded-md border border-hairline bg-white px-3 text-sm text-ash-700 focus-within:ring-2 focus-within:ring-ink-400/40">
            <input
              id="is_paid"
              name="is_paid"
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            <span>Employee already paid — mark as reimbursed</span>
          </label>
        </Field>
        {isPaid && (
          <Field
            label="Mode of payment"
            htmlFor="mode_of_payment"
            error={fe.mode_of_payment}
          >
            <SelectInput
              id="mode_of_payment"
              name="mode_of_payment"
              options={modesOfPayment}
              placeholder="Select mode"
              invalid={Boolean(fe.mode_of_payment)}
            />
          </Field>
        )}
      </FormSection>

      <div className="-mx-1 mt-6 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <Link
          href={"/hr/expense-claims" as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
        <Submit />
      </div>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      <Send className="h-4 w-4" />
      {pending ? "Submitting…" : "Submit claim"}
    </button>
  );
}
