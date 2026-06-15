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
import type { FormState } from "@/app/(workspace)/hr/shift-management/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

export function ShiftTypeForm({
  mode,
  action,
  holidayLists,
  shiftLocations,
  cancelHref,
  initial,
}: {
  mode: "create" | "edit";
  action: Action;
  holidayLists: string[];
  cancelHref: string;
  shiftLocations: string[];
  initial?: {
    name?: string;
    startTime?: string | null;
    endTime?: string | null;
    color?: string | null;
    enableAutoAttendance?: boolean;
    allowCheckOutAfterShiftEndTime?: boolean;
    holidayList?: string | null;
    workingHoursThresholdForHalfDay?: number | null;
    workingHoursThresholdForAbsent?: number | null;
    regularDayMultiplier?: number;
    saturdayDayMultiplier?: number;
    sundayDayMultiplier?: number;
    holidayDayMultiplier?: number;
    overtimeMultiplier?: number;
    allowedLocations?: string[];
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

      <FormSection title="Shift">
        <Field
          label="Name"
          htmlFor="name"
          required
          error={fe.name}
          hint={mode === "create" ? "e.g. Day Shift" : undefined}
        >
          <TextInput
            id="name"
            name="name"
            defaultValue={initial?.name}
            invalid={Boolean(fe.name)}
            readOnly={mode === "edit"}
            disabled={mode === "edit"}
          />
        </Field>
        <Field
          label="Color"
          htmlFor="color"
          hint="Hex code (#1E1B53), optional."
        >
          <TextInput
            id="color"
            name="color"
            defaultValue={initial?.color ?? undefined}
            placeholder="#1E1B53"
          />
        </Field>
        <Field
          label="Start time"
          htmlFor="start_time"
          required
          error={fe.start_time}
        >
          <TextInput
            id="start_time"
            name="start_time"
            type="time"
            defaultValue={trimTime(initial?.startTime)}
            invalid={Boolean(fe.start_time)}
          />
        </Field>
        <Field label="End time" htmlFor="end_time" required error={fe.end_time}>
          <TextInput
            id="end_time"
            name="end_time"
            type="time"
            defaultValue={trimTime(initial?.endTime)}
            invalid={Boolean(fe.end_time)}
          />
        </Field>
        <Field label="Holiday list" htmlFor="holiday_list">
          <SelectInput
            id="holiday_list"
            name="holiday_list"
            options={holidayLists}
            defaultValue={initial?.holidayList ?? ""}
            placeholder="—"
          />
        </Field>
      </FormSection>

      <FormSection
        title="Auto-attendance"
        description="When auto-attendance is on, Frappe rolls check-ins into Attendance records on the shift's threshold."
      >
        <div className="flex flex-col gap-3 sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="enable_auto_attendance"
              defaultChecked={initial?.enableAutoAttendance}
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Enable auto-attendance for this shift
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="allow_check_out_after_shift_end_time"
              defaultChecked={initial?.allowCheckOutAfterShiftEndTime}
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Allow check-out after the shift ends
          </label>
        </div>
        <Field
          label="Half-day if working hours ≤"
          htmlFor="working_hours_threshold_for_half_day"
          hint="Hours."
        >
          <TextInput
            id="working_hours_threshold_for_half_day"
            name="working_hours_threshold_for_half_day"
            type="number"
            step="0.25"
            min="0"
            defaultValue={
              initial?.workingHoursThresholdForHalfDay?.toString() ?? ""
            }
          />
        </Field>
        <Field
          label="Absent if working hours ≤"
          htmlFor="working_hours_threshold_for_absent"
          hint="Hours."
        >
          <TextInput
            id="working_hours_threshold_for_absent"
            name="working_hours_threshold_for_absent"
            type="number"
            step="0.25"
            min="0"
            defaultValue={
              initial?.workingHoursThresholdForAbsent?.toString() ?? ""
            }
          />
        </Field>
      </FormSection>

      <FormSection
        title="Allowed locations"
        description="Geofence-allowed locations for this shift. An employee's check-in is accepted only when they're within the radius of any of the ticked locations."
      >
        {shiftLocations.length === 0 ? (
          <p className="sm:col-span-2 text-xs text-ash-500">
            No shift locations defined yet. Create one under the Locations tab
            to enable geofencing.
          </p>
        ) : (
          <fieldset className="sm:col-span-2 flex flex-col gap-2">
            <legend className="sr-only">Allowed locations</legend>
            {shiftLocations.map((loc) => (
              <label
                key={loc}
                className="inline-flex items-center gap-2 text-sm text-ash-800"
              >
                <input
                  type="checkbox"
                  name="allowed_locations"
                  value={loc}
                  defaultChecked={initial?.allowedLocations?.includes(loc) ?? false}
                  className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
                />
                {loc}
              </label>
            ))}
          </fieldset>
        )}
      </FormSection>

      <FormSection
        title="Day-rate policy"
        description="Per-day pay multipliers — used when computing pay for an attendance record on this shift. Holiday wins over Sunday wins over Saturday."
      >
        <Field
          label="Regular day"
          htmlFor="regular_day_multiplier"
          hint="Mon–Fri (and Sat if you don't differentiate)."
        >
          <TextInput
            id="regular_day_multiplier"
            name="regular_day_multiplier"
            type="number"
            step="0.05"
            min="0"
            defaultValue={(initial?.regularDayMultiplier ?? 1).toString()}
          />
        </Field>
        <Field
          label="Saturday"
          htmlFor="saturday_day_multiplier"
          hint="Worked Saturdays (when not a holiday)."
        >
          <TextInput
            id="saturday_day_multiplier"
            name="saturday_day_multiplier"
            type="number"
            step="0.05"
            min="0"
            defaultValue={(initial?.saturdayDayMultiplier ?? 1.5).toString()}
          />
        </Field>
        <Field
          label="Sunday"
          htmlFor="sunday_day_multiplier"
          hint="Worked Sundays (when not a holiday)."
        >
          <TextInput
            id="sunday_day_multiplier"
            name="sunday_day_multiplier"
            type="number"
            step="0.05"
            min="0"
            defaultValue={(initial?.sundayDayMultiplier ?? 2).toString()}
          />
        </Field>
        <Field
          label="Holiday"
          htmlFor="holiday_day_multiplier"
          hint="Dates present in the holiday list above."
        >
          <TextInput
            id="holiday_day_multiplier"
            name="holiday_day_multiplier"
            type="number"
            step="0.05"
            min="0"
            defaultValue={(initial?.holidayDayMultiplier ?? 2.5).toString()}
          />
        </Field>
        <Field
          label="Overtime"
          htmlFor="overtime_multiplier"
          hint="Applied to any hours worked past the shift's end time."
        >
          <TextInput
            id="overtime_multiplier"
            name="overtime_multiplier"
            type="number"
            step="0.05"
            min="0"
            defaultValue={(initial?.overtimeMultiplier ?? 1.5).toString()}
          />
        </Field>
      </FormSection>

      <SubmitRow cancelHref={cancelHref} mode={mode} />
    </form>
  );
}

function trimTime(t?: string | null): string | undefined {
  if (!t) return undefined;
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function SubmitRow({
  cancelHref,
  mode,
}: {
  cancelHref: string;
  mode: "create" | "edit";
}) {
  return (
    <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
      <Link
        href={cancelHref as Route}
        className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
      >
        Cancel
      </Link>
      <Submit mode={mode} />
    </div>
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
      <Save className="h-4 w-4" />
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create shift type"
          : "Save changes"}
    </button>
  );
}
