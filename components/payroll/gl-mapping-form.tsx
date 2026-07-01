"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import {
  upsertGLMappingAction,
  type FormState,
} from "@/app/(workspace)/payroll/actions";

const EMPTY: FormState = {};

export function GLMappingForm({ categories }: { categories: string[] }) {
  const [state, dispatch] = useFormState(upsertGLMappingAction, EMPTY);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {state.error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      <Field label="Category" htmlFor="category" required error={fe.category} wide>
        <SelectInput id="category" name="category" options={categories} />
      </Field>

      <Field
        label="GL account"
        htmlFor="account"
        required
        error={fe.account}
        wide
        hint="Pick the chart-of-accounts node this category posts to (e.g. '2110 - Payroll Liabilities')."
      >
        <TextInput
          id="account"
          name="account"
          invalid={Boolean(fe.account)}
          placeholder="2110 - Payroll Liabilities - YourCo"
        />
      </Field>

      <Field label="Notes" htmlFor="notes" error={fe.notes} wide>
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
      {pending ? "Saving…" : "Save mapping"}
    </Button>
  );
}
