"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import {
  createTaxNoticeAction,
  type FormState,
} from "@/app/(workspace)/payroll/actions";

const EMPTY: FormState = {};

export function TaxNoticeForm() {
  const [state, dispatch] = useFormState(createTaxNoticeAction, EMPTY);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {state.error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      <Field label="Agency" htmlFor="agency" required error={fe.agency} wide>
        <TextInput
          id="agency"
          name="agency"
          invalid={Boolean(fe.agency)}
          placeholder="IRS / ZIMRA / CA EDD"
        />
      </Field>

      <Field label="Jurisdiction" htmlFor="jurisdiction" wide error={fe.jurisdiction}>
        <TextInput id="jurisdiction" name="jurisdiction" placeholder="Federal / State / National" />
      </Field>

      <Field label="Form" htmlFor="form" required error={fe.form} wide>
        <TextInput
          id="form"
          name="form"
          invalid={Boolean(fe.form)}
          placeholder="Form 941, DE-9, P2"
        />
      </Field>

      <Field label="Period" htmlFor="period" error={fe.period}>
        <TextInput id="period" name="period" placeholder="Q2 2026" />
      </Field>

      <Field label="Due date" htmlFor="due_date" error={fe.due_date}>
        <TextInput id="due_date" name="due_date" type="date" />
      </Field>

      <Field label="Amount" htmlFor="amount" error={fe.amount}>
        <TextInput id="amount" name="amount" type="number" step="0.01" min="0" />
      </Field>

      <Field label="Notes" htmlFor="notes" wide error={fe.notes}>
        <TextArea id="notes" name="notes" rows={2} />
      </Field>

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Log notice"}
    </Button>
  );
}
