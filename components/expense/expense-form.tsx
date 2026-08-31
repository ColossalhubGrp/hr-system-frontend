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
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import { ApproverPickerField } from "@/components/common/approver-picker-field";
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
  expenseTypes,
  employeeDirectory,
  payableAccountsByCompany,
  costCentersByCompany,
  modesOfPayment,
}: {
  action: Action;
  companies: string[];
  expenseTypes: string[];
  employeeDirectory: EmployeeDirectoryEntry[];
  payableAccountsByCompany: OptionsByCompany;
  costCentersByCompany: OptionsByCompany;
  modesOfPayment: string[];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  // Company drives which accounts + cost centers appear in the pickers
  // below. Default to the first company for a smooth first-load — user
  // can change it and the accounting selects rebuild.
  const [company, setCompany] = useState<string>(companies[0] ?? "");
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
        title="Expense line"
        description="One expense for now — extra lines come later."
      >
        <Field
          label="Expense date"
          htmlFor="expense_date"
          required
          error={fe.expense_date}
        >
          <TextInput
            id="expense_date"
            name="expense_date"
            type="date"
            invalid={Boolean(fe.expense_date)}
          />
        </Field>
        <Field
          label="Expense type"
          htmlFor="expense_type"
          required
          error={fe.expense_type}
        >
          <SelectInput
            id="expense_type"
            name="expense_type"
            options={expenseTypes}
            placeholder="Select expense type"
            invalid={Boolean(fe.expense_type)}
          />
        </Field>
        <Field label="Amount" htmlFor="amount" required error={fe.amount}>
          <TextInput
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            invalid={Boolean(fe.amount)}
          />
        </Field>
        <Field label="Description" htmlFor="description" wide>
          <TextArea id="description" name="description" rows={2} />
        </Field>
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
              ? `No payable accounts are set up for ${company} yet. Ask an admin to add one.`
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
