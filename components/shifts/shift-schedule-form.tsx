"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CalendarRange, Save } from "lucide-react";
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

const DAYS: Array<{ key: string; label: string; defaultOn: boolean }> = [
  { key: "monday", label: "Mon", defaultOn: true },
  { key: "tuesday", label: "Tue", defaultOn: true },
  { key: "wednesday", label: "Wed", defaultOn: true },
  { key: "thursday", label: "Thu", defaultOn: true },
  { key: "friday", label: "Fri", defaultOn: true },
  { key: "saturday", label: "Sat", defaultOn: false },
  { key: "sunday", label: "Sun", defaultOn: false },
];

export function ShiftScheduleForm({
  mode,
  action,
  shiftTypes,
  companies,
  holidayLists,
  cancelHref,
  initial,
}: {
  mode: "create" | "edit";
  action: Action;
  shiftTypes: string[];
  companies: string[];
  holidayLists: string[];
  cancelHref: string;
  initial?: {
    scheduleName?: string;
    shiftType?: string;
    company?: string | null;
    holidayList?: string | null;
    enabled?: boolean;
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    sunday?: boolean;
    notes?: string | null;
  };
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const dayInitial = (key: string, fallback: boolean): boolean => {
    if (!initial) return fallback;
    const v = (initial as Record<string, boolean | undefined>)[key];
    return v === undefined ? fallback : Boolean(v);
  };

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

      <FormSection title="Schedule">
        <Field
          label="Schedule name"
          htmlFor="schedule_name"
          required
          error={fe.schedule_name}
          hint={mode === "create" ? "e.g. Morning rotation — Mon–Fri" : undefined}
        >
          <TextInput
            id="schedule_name"
            name="schedule_name"
            defaultValue={initial?.scheduleName}
            invalid={Boolean(fe.schedule_name)}
            readOnly={mode === "edit"}
            disabled={mode === "edit"}
          />
        </Field>
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
            defaultValue={initial?.shiftType ?? ""}
            placeholder="Select shift"
            invalid={Boolean(fe.shift_type)}
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
        <Field
          label="Holiday list"
          htmlFor="holiday_list"
          hint="Dates on this list are skipped when materialising."
        >
          <SelectInput
            id="holiday_list"
            name="holiday_list"
            options={holidayLists}
            defaultValue={initial?.holidayList ?? ""}
            placeholder="—"
          />
        </Field>
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={initial?.enabled ?? true}
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Enabled — allow this schedule to be assigned and materialised
          </label>
        </div>
      </FormSection>

      <FormSection
        title="Days of week"
        description="Each ticked day will materialise into a Shift Assignment when this schedule is rolled out for an employee."
      >
        <fieldset className="sm:col-span-2 flex flex-wrap gap-2">
          <legend className="sr-only">Days of week</legend>
          {DAYS.map((d) => (
            <label
              key={d.key}
              className="inline-flex items-center gap-2 rounded-chip border border-hairline bg-surface px-3 py-1.5 text-sm text-ash-800 has-[:checked]:border-ink-300 has-[:checked]:bg-ink-50/60"
            >
              <input
                type="checkbox"
                name={d.key}
                defaultChecked={dayInitial(d.key, d.defaultOn)}
                className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
              />
              {d.label}
            </label>
          ))}
        </fieldset>
      </FormSection>

      <FormSection title="Notes">
        <Field label="Notes" htmlFor="notes" wide>
          <TextArea
            id="notes"
            name="notes"
            defaultValue={initial?.notes ?? ""}
            rows={3}
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
      {mode === "create" ? (
        <CalendarRange className="h-4 w-4" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create schedule"
          : "Save changes"}
    </button>
  );
}
