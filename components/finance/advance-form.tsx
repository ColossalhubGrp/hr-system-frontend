"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/cn";
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
import type { FormState } from "@/app/(workspace)/hr/employee-advances/actions";

const EMPTY: FormState = {};
type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function AdvanceForm({
  action,
  employeeDirectory,
  currencies,
  modesOfPayment,
  cancelHref = "/hr/employee-advances",
}: {
  action: Action;
  employeeDirectory: EmployeeDirectoryEntry[];
  currencies: string[];
  modesOfPayment: string[];
  cancelHref?: string;
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

      <FormSection title="Request">
        <EmployeePickerField
          name="employee"
          required
          error={fe.employee}
          directory={employeeDirectory}
        />
        <Field label="Purpose" htmlFor="purpose" required error={fe.purpose} wide>
          <TextArea
            id="purpose"
            name="purpose"
            rows={2}
            placeholder="What the advance is for — e.g. supplier deposit, travel per-diem."
            invalid={Boolean(fe.purpose)}
          />
        </Field>
        <Field label="Amount" htmlFor="advance_amount" required error={fe.advance_amount}>
          <TextInput
            id="advance_amount"
            name="advance_amount"
            type="number"
            step="0.01"
            min="0"
            invalid={Boolean(fe.advance_amount)}
          />
        </Field>
        <Field label="Currency" htmlFor="currency" hint="Defaults to company currency if blank.">
          <SelectInput
            id="currency"
            name="currency"
            options={currencies}
            placeholder="— default —"
          />
        </Field>
        <Field
          label="Exchange rate"
          htmlFor="exchange_rate"
          hint="Only needed for foreign-currency advances."
        >
          <TextInput id="exchange_rate" name="exchange_rate" type="number" step="0.0001" min="0" />
        </Field>
        <Field
          label="Date"
          htmlFor="posting_date"
          required
          error={fe.posting_date}
        >
          <TextInput id="posting_date" name="posting_date" type="date" invalid={Boolean(fe.posting_date)} />
        </Field>
      </FormSection>

      <FormSection title="Accounting (optional)">
        <Field label="Mode of payment" htmlFor="mode_of_payment">
          <SelectInput
            id="mode_of_payment"
            name="mode_of_payment"
            options={modesOfPayment}
            placeholder="— none —"
          />
        </Field>
        <Field
          label="Advance account"
          htmlFor="advance_account"
          hint="Leave blank to use the company default."
        >
          <TextInput id="advance_account" name="advance_account" placeholder="e.g. 1310 - Employee Advances" />
        </Field>
      </FormSection>

      <div className="-mx-1 mt-6 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <Link
          href={cancelHref as Route}
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
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Create advance"}
    </button>
  );
}
