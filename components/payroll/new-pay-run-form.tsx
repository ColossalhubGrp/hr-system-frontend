"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FormSection,
  SelectInput,
  TextInput,
} from "@/components/employee/form-bits";
import {
  createPayRunAction,
  type FormState,
} from "@/app/(workspace)/payroll/actions";

const EMPTY: FormState = {};

const FRAPPE_FREQUENCIES = [
  "Weekly",
  "Fortnightly",
  "Bimonthly",
  "Monthly",
  "Daily",
];

export function NewPayRunForm({
  defaultFrequency = "Monthly",
  defaultCurrency,
  defaultPayableAccount,
  payableAccounts,
}: {
  defaultFrequency?: string;
  defaultCurrency: string;
  defaultPayableAccount: string | null;
  payableAccounts: { name: string; account_name: string }[];
}) {
  const [state, dispatch] = useFormState(createPayRunAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  // Sensible defaults: this month's first → last day, pay on the last day.
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          {state.error}
        </p>
      )}

      <FormSection title="Pay period">
        <Field label="Start date" htmlFor="start_date" required error={fe.start_date}>
          <TextInput
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={first}
            invalid={Boolean(fe.start_date)}
          />
        </Field>
        <Field label="End date" htmlFor="end_date" required error={fe.end_date}>
          <TextInput
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={last}
            invalid={Boolean(fe.end_date)}
          />
        </Field>
        <Field label="Pay date" htmlFor="posting_date" required error={fe.posting_date}>
          <TextInput
            id="posting_date"
            name="posting_date"
            type="date"
            defaultValue={last}
            invalid={Boolean(fe.posting_date)}
          />
        </Field>
        <Field
          label="Frequency"
          htmlFor="payroll_frequency"
          required
          error={fe.payroll_frequency}
        >
          <SelectInput
            id="payroll_frequency"
            name="payroll_frequency"
            options={FRAPPE_FREQUENCIES}
            defaultValue={defaultFrequency}
          />
        </Field>
      </FormSection>

      <FormSection title="Posting & accounting">
        <Field
          label="Currency"
          htmlFor="currency"
          required
          error={fe.currency}
          hint="Only employees whose pay currency matches will be included. Run again for each currency in use."
        >
          <TextInput
            id="currency"
            name="currency"
            defaultValue={defaultCurrency}
            invalid={Boolean(fe.currency)}
          />
        </Field>
        <Field
          label="Exchange rate"
          htmlFor="exchange_rate"
          required
          error={fe.exchange_rate}
          hint="1.0 unless paying in a currency other than the company's books"
        >
          <TextInput
            id="exchange_rate"
            name="exchange_rate"
            type="number"
            step="0.000001"
            defaultValue="1"
            invalid={Boolean(fe.exchange_rate)}
          />
        </Field>
        <Field
          label="Payroll payable account"
          htmlFor="payroll_payable_account"
          required
          error={fe.payroll_payable_account}
          hint="GL liability account where net pay sits between run-approval and bank settlement"
          wide
        >
          {payableAccounts.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No liability accounts found on this company's chart of
              accounts. Ask an accounts admin to create a "Payroll
              Payable" account before running payroll.
            </p>
          ) : (
            <select
              id="payroll_payable_account"
              name="payroll_payable_account"
              defaultValue={defaultPayableAccount ?? ""}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— select an account —</option>
              {payableAccounts.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.account_name} — {a.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </FormSection>

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" />
      {pending ? "Creating…" : "Create pay run"}
      {!pending && <ArrowRight className="h-4 w-4" />}
    </Button>
  );
}
