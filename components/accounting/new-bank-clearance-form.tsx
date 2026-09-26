"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import { createClearanceAction, type FormState } from "@/app/(workspace)/accounting/banking/clearance/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function NewBankClearanceForm({
  accounts,
  bankAccounts,
  defaultDate,
}: {
  accounts: AccountOption[];
  bankAccounts: string[];
  defaultDate: string;
}) {
  const [state, dispatch] = useFormState(createClearanceAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Batch" description="Pick the GL account (typically a bank asset) + date range, then load the payments to clear.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GL account" htmlFor="account" error={fe.account} required>
            <SelectInput id="account" name="account" defaultValue="" options={[...accounts.map((a) => ({ value: a.name, label: a.name }))]} />
          </Field>
          <Field label="Bank Account (optional)" htmlFor="bank_account">
            <SelectInput id="bank_account" name="bank_account" defaultValue="" options={[...bankAccounts.map((b) => ({ value: b, label: b }))]} />
          </Field>
          <Field label="From date" htmlFor="from_date" error={fe.from_date} required>
            <TextInput id="from_date" name="from_date" type="date" defaultValue={defaultDate} />
          </Field>
          <Field label="To date" htmlFor="to_date" error={fe.to_date} required>
            <TextInput id="to_date" name="to_date" type="date" defaultValue={defaultDate} />
          </Field>
        </div>
      </FormSection>
      <div className="flex items-center justify-end gap-2">
        <Link href={"/accounting/banking/clearance" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
        <Sub />
      </div>
    </form>
  );
}

function Sub() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" />
      {pending ? "Creating…" : "Create batch"}
    </button>
  );
}
