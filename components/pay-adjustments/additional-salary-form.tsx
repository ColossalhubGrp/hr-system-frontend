"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextInput,
} from "@/components/employee/form-bits";
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import type { FormState } from "@/app/(workspace)/payroll/adjustments/actions";

const EMPTY: FormState = {};
type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function AdditionalSalaryForm({
  action,
  employeeDirectory,
  components,
  currencies,
  companies,
}: {
  action: Action;
  employeeDirectory: EmployeeDirectoryEntry[];
  components: string[];
  currencies: string[];
  companies: string[];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const [isRecurring, setIsRecurring] = useState(false);
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

      <FormSection title="Adjustment">
        <EmployeePickerField
          name="employee"
          required
          error={fe.employee}
          directory={employeeDirectory}
        />
        <Field
          label="Salary component"
          htmlFor="salary_component"
          required
          error={fe.salary_component}
        >
          {components.length > 0 ? (
            <SelectInput
              id="salary_component"
              name="salary_component"
              options={components}
              placeholder="Pick a component"
            />
          ) : (
            <TextInput id="salary_component" name="salary_component" placeholder="Component name" />
          )}
        </Field>
        <Field label="Amount" htmlFor="amount" required error={fe.amount}>
          <TextInput id="amount" name="amount" type="number" step="0.01" min="0" />
        </Field>
        <Field label="Currency" htmlFor="currency" hint="Defaults to company currency if blank.">
          <SelectInput id="currency" name="currency" options={currencies} placeholder="— default —" />
        </Field>
        <Field label="Company" htmlFor="company">
          <SelectInput id="company" name="company" options={companies} placeholder="— default —" />
        </Field>
        <Field label="Payroll date" htmlFor="payroll_date" required error={fe.payroll_date}>
          <TextInput id="payroll_date" name="payroll_date" type="date" />
        </Field>
      </FormSection>

      <FormSection title="Options">
        <Field
          label="Recurring"
          htmlFor="is_recurring"
          hint="Repeats every payroll between From and To dates."
        >
          <label className="flex h-10 items-center gap-2 rounded-md border border-hairline bg-white px-3 text-sm text-ash-700">
            <input
              type="checkbox"
              id="is_recurring"
              name="is_recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 accent-ink-800"
            />
            Recurring adjustment
          </label>
        </Field>
        {isRecurring && (
          <>
            <Field label="From date" htmlFor="from_date" required error={fe.from_date}>
              <TextInput id="from_date" name="from_date" type="date" />
            </Field>
            <Field label="To date" htmlFor="to_date" required error={fe.to_date}>
              <TextInput id="to_date" name="to_date" type="date" />
            </Field>
          </>
        )}
        <Field
          label="Overwrite structure amount"
          htmlFor="overwrite"
          hint="Replaces the same component's amount from the Salary Structure instead of adding to it."
        >
          <label className="flex h-10 items-center gap-2 rounded-md border border-hairline bg-white px-3 text-sm text-ash-700">
            <input
              type="checkbox"
              id="overwrite"
              name="overwrite"
              className="h-4 w-4 accent-ink-800"
            />
            Overwrite instead of add
          </label>
        </Field>
        <Field
          label="Deduct full tax on this payroll date"
          htmlFor="deduct_full_tax"
        >
          <label className="flex h-10 items-center gap-2 rounded-md border border-hairline bg-white px-3 text-sm text-ash-700">
            <input
              type="checkbox"
              id="deduct_full_tax"
              name="deduct_full_tax"
              className="h-4 w-4 accent-ink-800"
            />
            Take all resulting tax on the selected payroll date
          </label>
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail">
        <Link
          href={"/payroll/adjustments" as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
        <Submit label="Create adjustment" />
      </div>
    </form>
  );
}

export function SimpleWrapperForm({
  kind,
  action,
  employeeDirectory,
  components,
  companies,
}: {
  kind: "retention" | "incentive";
  action: Action;
  employeeDirectory: EmployeeDirectoryEntry[];
  components: string[];
  companies: string[];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const amountName = kind === "retention" ? "bonus_amount" : "incentive_amount";
  const dateName = kind === "retention" ? "bonus_payment_date" : "payroll_date";
  const amountLabel = kind === "retention" ? "Bonus amount" : "Incentive amount";
  const dateLabel = kind === "retention" ? "Payment date" : "Payroll date";

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

      <FormSection
        title={kind === "retention" ? "Retention bonus" : "Employee incentive"}
        description={
          kind === "retention"
            ? "Submitting creates a matching Additional Salary line that flows into the next Salary Slip."
            : "Submitting creates a matching Additional Salary line that flows into the next Salary Slip."
        }
      >
        <EmployeePickerField
          name="employee"
          required
          error={fe.employee}
          directory={employeeDirectory}
        />
        <Field label="Salary component" htmlFor="salary_component" required error={fe.salary_component}>
          {components.length > 0 ? (
            <SelectInput
              id="salary_component"
              name="salary_component"
              options={components}
              placeholder="Pick a component"
            />
          ) : (
            <TextInput id="salary_component" name="salary_component" placeholder="Component name" />
          )}
        </Field>
        <Field label={amountLabel} htmlFor={amountName} required error={fe[amountName]}>
          <TextInput id={amountName} name={amountName} type="number" step="0.01" min="0" />
        </Field>
        <Field label={dateLabel} htmlFor={dateName} required error={fe[dateName]}>
          <TextInput id={dateName} name={dateName} type="date" />
        </Field>
        <Field label="Company" htmlFor="company">
          <SelectInput id="company" name="company" options={companies} placeholder="— default —" />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail">
        <Link
          href={"/payroll/adjustments" as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
        <Submit label={kind === "retention" ? "Create bonus" : "Create incentive"} />
      </div>
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : label}
    </button>
  );
}
