"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, UserCog } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/hr/shift-management/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export function ScheduleAssignmentForm({
  mode,
  action,
  schedules,
  employees,
  companies,
  cancelHref,
  initial,
}: {
  mode: "create" | "edit";
  action: Action;
  schedules: string[];
  employees: Array<{ id: string; name: string }>;
  companies: string[];
  cancelHref: string;
  initial?: {
    shiftSchedule?: string;
    employee?: string;
    startDate?: string;
    endDate?: string | null;
    status?: string;
    company?: string | null;
    notes?: string | null;
  };
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

      <FormSection title="Assignment">
        <Field
          label="Shift schedule"
          htmlFor="shift_schedule"
          required
          error={fe.shift_schedule}
        >
          <SelectInput
            id="shift_schedule"
            name="shift_schedule"
            options={schedules}
            defaultValue={initial?.shiftSchedule ?? ""}
            placeholder="Select schedule"
            invalid={Boolean(fe.shift_schedule)}
          />
        </Field>
        <Field
          label="Employee"
          htmlFor="employee"
          required
          error={fe.employee}
        >
          <select
            id="employee"
            name="employee"
            defaultValue={initial?.employee ?? ""}
            className={cn(
              "h-10 w-full rounded-chip border bg-surface pl-3 pr-8 text-sm text-ash-800 focus-ring",
              fe.employee ? "border-fall/40" : "border-hairline",
            )}
          >
            <option value="">Select employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.id}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Start date"
          htmlFor="start_date"
          required
          error={fe.start_date}
        >
          <TextInput
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={initial?.startDate ?? ""}
            invalid={Boolean(fe.start_date)}
          />
        </Field>
        <Field
          label="End date"
          htmlFor="end_date"
          error={fe.end_date}
          hint="Leave blank for open-ended."
        >
          <TextInput
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={initial?.endDate ?? ""}
            invalid={Boolean(fe.end_date)}
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <SelectInput
            id="status"
            name="status"
            options={["Active", "Inactive"]}
            defaultValue={initial?.status ?? "Active"}
          />
        </Field>
        <Field label="Company" htmlFor="company">
          <SelectInput
            id="company"
            name="company"
            options={companies}
            defaultValue={initial?.company ?? ""}
            placeholder="—"
          />
        </Field>
        <Field label="Notes" htmlFor="notes" wide>
          <TextArea
            id="notes"
            name="notes"
            defaultValue={initial?.notes ?? ""}
            rows={2}
          />
        </Field>
      </FormSection>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <Link
          href={cancelHref as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
        <Submit mode={mode} />
      </div>
    </form>
  );
}

function Submit({ mode }: { mode: "create" | "edit" }) {
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
      {mode === "create" ? <UserCog className="h-4 w-4" /> : <Save className="h-4 w-4" />}
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create assignment"
          : "Save changes"}
    </button>
  );
}
