"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Send } from "lucide-react";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/hr/expense-claims/actions";
import { cn } from "@/lib/cn";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export function ExpenseClaimForm({
  action,
  companies,
  expenseTypes,
}: {
  action: Action;
  companies: string[];
  expenseTypes: string[];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

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
        <Field
          label="Employee"
          htmlFor="employee"
          required
          error={fe.employee}
          hint="Employee ID, e.g. HR-EMP-00292"
        >
          <TextInput
            id="employee"
            name="employee"
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field label="Company" htmlFor="company" required error={fe.company}>
          <SelectInput
            id="company"
            name="company"
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
        <Field label="Approver" htmlFor="approver" error={fe.approver}>
          <TextInput
            id="approver"
            name="approver"
            type="email"
            invalid={Boolean(fe.approver)}
          />
        </Field>
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

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
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
