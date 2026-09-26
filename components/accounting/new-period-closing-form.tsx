"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "@/components/employee/form-bits";
import { createPeriodClosingAction, type FormState } from "@/app/(workspace)/accounting/tools/period-close/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function NewPeriodClosingForm({
  companies,
  fiscalYears,
  accounts,
  defaultDate,
}: {
  companies: string[];
  fiscalYears: string[];
  accounts: AccountOption[];
  defaultDate: string;
}) {
  const [state, dispatch] = useFormState(createPeriodClosingAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Voucher" description="Company + year to close + the retained-earnings account to sweep P&L into.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={companies[0] ?? ""} options={companies} />
          </Field>
          <Field label="Fiscal year" htmlFor="fiscal_year" error={fe.fiscal_year} required>
            <SelectInput id="fiscal_year" name="fiscal_year" defaultValue={fiscalYears[0] ?? ""} options={fiscalYears} />
          </Field>
          <Field label="Posting date" htmlFor="posting_date" error={fe.posting_date} required>
            <TextInput id="posting_date" name="posting_date" type="date" defaultValue={defaultDate} />
          </Field>
          <Field label="Closing account (retained earnings)" htmlFor="closing_account_head" error={fe.closing_account_head} required>
            <SelectInput id="closing_account_head" name="closing_account_head" defaultValue="" options={[...accounts.map((a) => ({ value: a.name, label: a.name }))]} />
          </Field>
          <Field label="Cost centre" htmlFor="cost_center">
            <TextInput id="cost_center" name="cost_center" />
          </Field>
          <Field label="Finance book" htmlFor="finance_book">
            <TextInput id="finance_book" name="finance_book" />
          </Field>
          <Field label="Remarks" htmlFor="remarks" wide>
            <TextArea id="remarks" name="remarks" rows={2} />
          </Field>
        </div>
      </FormSection>
      <p className="text-xs text-muted-foreground">
        Submitting posts a Journal Entry that zeroes every income and expense account and puts the net into the closing account. Only submit at year-end after all invoices are posted and reconciled.
      </p>
      <div className="flex items-center justify-end gap-2">
        <Link href={"/accounting/tools/period-close" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      {pending ? "Saving…" : "Save draft"}
    </button>
  );
}
