"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, LogIn } from "lucide-react";
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

export function CheckinForm({
  action,
  cancelHref,
  defaultEmployee,
}: {
  action: Action;
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

      <FormSection title="Punch">
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
        <Field label="Log type" htmlFor="log_type" required error={fe.log_type}>
          <SelectInput
            id="log_type"
            name="log_type"
            options={["IN", "OUT"]}
            defaultValue="IN"
            invalid={Boolean(fe.log_type)}
          />
        </Field>
        <Field
          label="Time"
          htmlFor="time"
          required
          error={fe.time}
          hint="When the punch happened."
        >
          <TextInput
            id="time"
            name="time"
            type="datetime-local"
            invalid={Boolean(fe.time)}
          />
        </Field>
        <Field
          label="Device"
          htmlFor="device_id"
          hint="Optional device label (e.g. KIOSK-01)."
        >
          <TextInput id="device_id" name="device_id" />
        </Field>
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="skip_auto_attendance"
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Skip auto-attendance for this punch
          </label>
        </div>
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
      <LogIn className="h-4 w-4" />
      {pending ? "Logging…" : "Log punch"}
    </button>
  );
}
