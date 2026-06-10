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
import type {
  FormState as LeaveFormState,
} from "@/app/(workspace)/hr/leaves/actions";

type Action = (prev: LeaveFormState, form: FormData) => Promise<LeaveFormState>;

type Props = {
  action: Action;
  leaveTypes: string[];
  defaultEmployee?: string;
  defaultApprover?: string;
};

const EMPTY: LeaveFormState = {};

export function LeaveForm({
  action,
  leaveTypes,
  defaultEmployee,
  defaultApprover,
}: Props) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [halfDay, setHalfDay] = useState(false);

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
          label="Leave type"
          htmlFor="leave_type"
          required
          error={fe.leave_type}
        >
          <SelectInput
            id="leave_type"
            name="leave_type"
            options={leaveTypes}
            placeholder="Select leave type"
            invalid={Boolean(fe.leave_type)}
          />
        </Field>
        <Field
          label="From"
          htmlFor="from_date"
          required
          error={fe.from_date}
        >
          <TextInput
            id="from_date"
            name="from_date"
            type="date"
            invalid={Boolean(fe.from_date)}
          />
        </Field>
        <Field
          label="To"
          htmlFor="to_date"
          required
          error={fe.to_date}
        >
          <TextInput
            id="to_date"
            name="to_date"
            type="date"
            invalid={Boolean(fe.to_date)}
          />
        </Field>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="half_day"
              checked={halfDay}
              onChange={(e) => setHalfDay(e.target.checked)}
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Half-day
          </label>
          {halfDay && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Which day"
                htmlFor="half_day_date"
                hint="Only one day in the range is a half-day."
              >
                <TextInput
                  id="half_day_date"
                  name="half_day_date"
                  type="date"
                />
              </Field>
            </div>
          )}
        </div>
        <Field
          label="Approver"
          htmlFor="leave_approver"
          error={fe.leave_approver}
          hint="Optional — defaults to the employee's assigned leave approver."
        >
          <TextInput
            id="leave_approver"
            name="leave_approver"
            type="email"
            defaultValue={defaultApprover}
            invalid={Boolean(fe.leave_approver)}
          />
        </Field>
        <Field label="Reason" htmlFor="description" wide>
          <TextArea id="description" name="description" rows={3} />
        </Field>
      </FormSection>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <Link
          href={"/hr/leaves" as Route}
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
      {pending ? "Submitting…" : "Submit application"}
    </button>
  );
}
