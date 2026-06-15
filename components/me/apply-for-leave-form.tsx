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
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import type { ApplyForLeaveState } from "@/app/(workspace)/me/leave/actions";

type Action = (
  prev: ApplyForLeaveState,
  form: FormData,
) => Promise<ApplyForLeaveState>;
const EMPTY: ApplyForLeaveState = {};

export function ApplyForLeaveForm({
  action,
  leaveTypes,
}: {
  action: Action;
  leaveTypes: string[];
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
          label="From date"
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
          label="To date"
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
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="half_day"
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Apply as half day
          </label>
        </div>
        <Field label="Reason" htmlFor="description" wide>
          <TextArea
            id="description"
            name="description"
            rows={3}
            placeholder="Optional — context for your approver."
          />
        </Field>
      </FormSection>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <Link
          href={"/me/leave" as Route}
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
      {pending ? "Submitting…" : "Submit request"}
    </button>
  );
}
