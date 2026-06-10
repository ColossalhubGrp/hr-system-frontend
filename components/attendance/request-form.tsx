"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/hr/attendance/actions";

// Mirror of the server-side ATTENDANCE_REQUEST_REASONS list — inlined so this
// client component doesn't pull `server-only` lib into the browser bundle.
const ATTENDANCE_REQUEST_REASONS = [
  "Work From Home",
  "On Duty",
  "Forgot to Punch In",
  "Forgot to Punch Out",
];

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export function AttendanceRequestForm({
  action,
  companies,
  cancelHref,
  defaultEmployee,
}: {
  action: Action;
  companies: string[];
  cancelHref: string;
  defaultEmployee?: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const [halfDay, setHalfDay] = useState(false);
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
        <Field
          label="Employee"
          htmlFor="employee"
          required
          error={fe.employee}
        >
          <TextInput
            id="employee"
            name="employee"
            defaultValue={defaultEmployee}
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field label="Reason" htmlFor="reason" required error={fe.reason}>
          <SelectInput
            id="reason"
            name="reason"
            options={[...ATTENDANCE_REQUEST_REASONS]}
            placeholder="Select reason"
            invalid={Boolean(fe.reason)}
          />
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
        <div className="flex flex-col gap-3 sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="half_day"
              checked={halfDay}
              onChange={(e) => setHalfDay(e.target.checked)}
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Mark this request as a half-day
          </label>
          {halfDay && (
            <Field label="Half-day date" htmlFor="half_day_date">
              <TextInput
                id="half_day_date"
                name="half_day_date"
                type="date"
              />
            </Field>
          )}
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="include_holidays"
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Include holidays within the range
          </label>
        </div>
        <Field label="Company" htmlFor="company">
          <SelectInput
            id="company"
            name="company"
            options={companies}
            placeholder="—"
          />
        </Field>
        <Field label="Explanation" htmlFor="explanation" wide>
          <TextArea id="explanation" name="explanation" rows={3} />
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
      <Send className="h-4 w-4" />
      {pending ? "Filing…" : "File request"}
    </button>
  );
}
