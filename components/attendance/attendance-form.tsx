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
import type { FormState } from "@/app/(workspace)/hr/attendance/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

const STATUSES = [
  "Present",
  "Absent",
  "On Leave",
  "Half Day",
  "Work From Home",
];

export function AttendanceForm({
  action,
  shiftTypes,
  companies,
  cancelHref,
  defaultEmployee,
}: {
  action: Action;
  shiftTypes: string[];
  companies: string[];
  cancelHref: string;
  defaultEmployee?: string;
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

      <FormSection title="Attendance">
        <Field
          label="Employee"
          htmlFor="employee"
          required
          error={fe.employee}
          hint="Employee ID, e.g. HR-EMP-00292"
        >
          <TextInput
            id="employee"
            name="employee"
            defaultValue={defaultEmployee}
            invalid={Boolean(fe.employee)}
          />
        </Field>
        <Field
          label="Date"
          htmlFor="attendance_date"
          required
          error={fe.attendance_date}
        >
          <TextInput
            id="attendance_date"
            name="attendance_date"
            type="date"
            invalid={Boolean(fe.attendance_date)}
          />
        </Field>
        <Field label="Status" htmlFor="status" required error={fe.status}>
          <SelectInput
            id="status"
            name="status"
            options={STATUSES}
            defaultValue="Present"
            invalid={Boolean(fe.status)}
          />
        </Field>
        <Field label="Shift" htmlFor="shift">
          <SelectInput
            id="shift"
            name="shift"
            options={shiftTypes}
            placeholder="—"
          />
        </Field>
        <Field
          label="Check-in"
          htmlFor="in_time"
          hint="Optional — leave empty for non-Present statuses."
        >
          <TextInput id="in_time" name="in_time" type="datetime-local" />
        </Field>
        <Field label="Check-out" htmlFor="out_time">
          <TextInput id="out_time" name="out_time" type="datetime-local" />
        </Field>
        <Field label="Company" htmlFor="company">
          <SelectInput
            id="company"
            name="company"
            options={companies}
            placeholder="—"
          />
        </Field>
      </FormSection>

      <SubmitRow cancelHref={cancelHref} label="Mark attendance" pendingLabel="Marking…" />
    </form>
  );
}

function SubmitRow({
  cancelHref,
  label,
  pendingLabel,
}: {
  cancelHref: string;
  label: string;
  pendingLabel: string;
}) {
  return (
    <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
      <Link
        href={cancelHref as Route}
        className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
      >
        Cancel
      </Link>
      <Submit label={label} pendingLabel={pendingLabel} />
    </div>
  );
}

function Submit({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
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
      {pending ? pendingLabel : label}
    </button>
  );
}
