"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Send } from "lucide-react";
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
import { ApproverPickerField } from "@/components/common/approver-picker-field";
import type { FormState } from "@/app/(workspace)/hr/shift-management/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export function ShiftRequestForm({
  action,
  shiftTypes,
  employeeDirectory,
  cancelHref,
  defaultEmployee,
}: {
  action: Action;
  shiftTypes: string[];
  employeeDirectory: EmployeeDirectoryEntry[];
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

      <FormSection title="Request">
        <EmployeePickerField
          name="employee"
          required
          error={fe.employee}
          directory={employeeDirectory}
          defaultValue={defaultEmployee}
        />
        <Field
          label="Shift type"
          htmlFor="shift_type"
          required
          error={fe.shift_type}
        >
          <SelectInput
            id="shift_type"
            name="shift_type"
            options={shiftTypes}
            placeholder="Select shift"
            invalid={Boolean(fe.shift_type)}
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
        <Field label="To" htmlFor="to_date" error={fe.to_date}>
          <TextInput
            id="to_date"
            name="to_date"
            type="date"
            invalid={Boolean(fe.to_date)}
          />
        </Field>
        <ApproverPickerField
          name="approver"
          error={fe.approver}
          directory={employeeDirectory}
          hint="Leave blank to use the employee's default shift-request approver."
        />
      </FormSection>

      <div className="-mx-1 mt-6 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
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
