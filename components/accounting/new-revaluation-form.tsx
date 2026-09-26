"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import { createRevaluationAction, type FormState } from "@/app/(workspace)/accounting/multi-currency/revaluation/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function NewRevaluationForm({
  companies,
  accounts,
  defaultDate,
}: {
  companies: string[];
  accounts: AccountOption[];
  defaultDate: string;
}) {
  const [state, dispatch] = useFormState(createRevaluationAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Revaluation" description="Company + posting date + where to land the unrealized gain/loss.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={companies[0] ?? ""} options={companies} />
          </Field>
          <Field label="Posting date" htmlFor="posting_date" error={fe.posting_date} required>
            <TextInput id="posting_date" name="posting_date" type="date" defaultValue={defaultDate} />
          </Field>
          <Field label="Gain/loss account" htmlFor="gain_loss_account" error={fe.gain_loss_account} required>
            <SelectInput id="gain_loss_account" name="gain_loss_account" defaultValue="" options={[{ value: "", label: "—" }, ...accounts.map((a) => ({ value: a.name, label: a.name }))]} />
          </Field>
          <Field label="Rounding loss allowance" htmlFor="rounding_loss_allowance">
            <TextInput id="rounding_loss_allowance" name="rounding_loss_allowance" type="number" step="0.01" min="0" defaultValue="0.05" className="tabular-nums" />
          </Field>
        </div>
      </FormSection>
      <p className="text-xs text-muted-foreground">
        After saving, hit &ldquo;Fetch balances&rdquo; on the detail page to pull every foreign-currency GL balance and current vs new exchange rate. Submit posts a Journal Entry recording the FX gain/loss.
      </p>
      <div className="flex items-center justify-end gap-2">
        <Link href={"/accounting/multi-currency/revaluation" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      {pending ? "Creating…" : "Create draft"}
    </button>
  );
}
