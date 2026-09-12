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
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import type { FormState } from "@/app/(workspace)/hr/exit-interviews/actions";

const EMPTY: FormState = {};
type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function ExitInterviewForm({
  action,
  employeeDirectory,
  cancelHref = "/hr/exit-interviews",
}: {
  action: Action;
  employeeDirectory: EmployeeDirectoryEntry[];
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

      <FormSection title="Interview">
        <EmployeePickerField
          name="employee"
          required
          error={fe.employee}
          directory={employeeDirectory}
        />
        <Field label="Interview date" htmlFor="interview_date">
          <TextInput id="interview_date" name="interview_date" type="date" />
        </Field>
        <Field label="Outcome" htmlFor="employee_status">
          <SelectInput
            id="employee_status"
            name="employee_status"
            options={["Employee Retained", "Exit Confirmed"]}
            placeholder="— tbd —"
          />
        </Field>
        <Field
          label="Interviewers (comma-separated user emails)"
          htmlFor="interviewers_csv"
          wide
        >
          <TextInput
            id="interviewers_csv"
            name="interviewers_csv"
            placeholder="hr@example.com, manager@example.com"
          />
        </Field>
        <Field label="Reason for leaving" htmlFor="reason_for_leaving" wide>
          <TextArea
            id="reason_for_leaving"
            name="reason_for_leaving"
            rows={2}
            placeholder="Short summary. Details go in Feedback below."
          />
        </Field>
        <Field label="Feedback" htmlFor="feedback" wide>
          <TextArea id="feedback" name="feedback" rows={6} />
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
      {pending ? "Saving…" : "Create interview"}
    </button>
  );
}
