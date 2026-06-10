"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/hr/performance/actions";

// Client mirror — kept in sync with lib/frappe/performance.ts.
const PIP_STATUSES = ["Open", "Completed", "Cancelled"];

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export function PipForm({
  action,
  cycles,
  cancelHref,
}: {
  action: Action;
  cycles: string[];
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

      <FormSection title="Improvement plan">
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
        <Field label="From" htmlFor="from_date" required error={fe.from_date}>
          <TextInput
            id="from_date"
            name="from_date"
            type="date"
            invalid={Boolean(fe.from_date)}
          />
        </Field>
        <Field label="To" htmlFor="to_date" required error={fe.to_date}>
          <TextInput
            id="to_date"
            name="to_date"
            type="date"
            invalid={Boolean(fe.to_date)}
          />
        </Field>
        <Field label="Appraisal cycle" htmlFor="appraisal_cycle">
          <SelectInput
            id="appraisal_cycle"
            name="appraisal_cycle"
            options={cycles}
            placeholder="—"
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <SelectInput
            id="status"
            name="status"
            options={PIP_STATUSES}
            defaultValue="Open"
          />
        </Field>
        <Field label="Reason for PIP" htmlFor="reason_for_pip" wide>
          <TextArea id="reason_for_pip" name="reason_for_pip" rows={3} />
        </Field>
        <Field label="Improvement plan" htmlFor="improvement_plan" wide>
          <TextArea id="improvement_plan" name="improvement_plan" rows={4} />
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
      <AlertTriangle className="h-4 w-4" />
      {pending ? "Filing…" : "File PIP"}
    </button>
  );
}
