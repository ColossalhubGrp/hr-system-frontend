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
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/hr/performance/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export function AppraisalForm({
  action,
  cycles,
  templates,
  cancelHref,
}: {
  action: Action;
  cycles: string[];
  templates: string[];
  cancelHref: string;
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

      <FormSection title="Appraisal">
        <Field
          label="Employee"
          htmlFor="employee"
          required
          error={fe.employee}
        >
          <TextInput
            id="employee"
            name="employee"
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field label="Reviewer" htmlFor="reviewer" hint="Reviewer email.">
          <TextInput id="reviewer" name="reviewer" type="email" />
        </Field>
        <Field label="Appraisal cycle" htmlFor="appraisal_cycle">
          <SelectInput
            id="appraisal_cycle"
            name="appraisal_cycle"
            options={cycles}
            placeholder="—"
          />
        </Field>
        <Field label="Template" htmlFor="appraisal_template">
          <SelectInput
            id="appraisal_template"
            name="appraisal_template"
            options={templates}
            placeholder="—"
          />
        </Field>
        <Field label="Start date" htmlFor="start_date">
          <TextInput id="start_date" name="start_date" type="date" />
        </Field>
        <Field label="End date" htmlFor="end_date">
          <TextInput id="end_date" name="end_date" type="date" />
        </Field>
      </FormSection>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
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
      {pending ? "Creating…" : "Create appraisal"}
    </button>
  );
}
