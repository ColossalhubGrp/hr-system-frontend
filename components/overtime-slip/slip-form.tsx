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
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import type { FormState } from "@/app/(workspace)/hr/overtime-slips/actions";

const EMPTY: FormState = {};
type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function OvertimeSlipForm({
  action,
  employeeDirectory,
  companies,
  cancelHref = "/hr/overtime-slips",
}: {
  action: Action;
  employeeDirectory: EmployeeDirectoryEntry[];
  companies: string[];
  cancelHref?: string;
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

      <FormSection
        title="Slip"
        description="Save the slip, then pull overtime from Attendance on the detail page."
      >
        <EmployeePickerField
          name="employee"
          required
          error={fe.employee}
          directory={employeeDirectory}
        />
        <Field label="From date" htmlFor="from_date" required error={fe.from_date}>
          <TextInput id="from_date" name="from_date" type="date" invalid={Boolean(fe.from_date)} />
        </Field>
        <Field label="To date" htmlFor="to_date" required error={fe.to_date}>
          <TextInput id="to_date" name="to_date" type="date" invalid={Boolean(fe.to_date)} />
        </Field>
        <Field label="Company" htmlFor="company">
          <SelectInput id="company" name="company" options={companies} placeholder="— default —" />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail">
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
        "hover:bg-ink-700 disabled:opacity-60",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Create slip"}
    </button>
  );
}
