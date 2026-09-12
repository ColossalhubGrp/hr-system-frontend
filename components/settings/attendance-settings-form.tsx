"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StdFormState } from "@/lib/frappe/form-errors";
import type { ShiftHrSettings } from "@/lib/frappe/hr-settings";

type State = StdFormState & { success?: boolean };
type Action = (prev: State, form: FormData) => Promise<State>;
const EMPTY: State = {};

export function AttendanceSettingsForm({
  action,
  initial,
}: {
  action: Action;
  initial: ShiftHrSettings;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="flex items-center gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-3 text-sm text-ink-900">
          <CheckCircle2 className="h-4 w-4 text-rise" />
          Saved. New settings apply to the next check-in / shift assignment.
        </p>
      )}

      <section className="card flex flex-col gap-4 p-6">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="allow_geolocation_tracking"
            defaultChecked={initial.allowGeolocationTracking}
            className="mt-1 h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
          />
          <span className="flex flex-col gap-1">
            <span className="font-medium text-ink-900">
              Allow geolocation tracking on check-in
            </span>
            <span className="text-xs text-ash-600">
              When on, every check-in captures the browser&apos;s latitude/
              longitude and Shift Locations enforce their radius. Off →
              geofence checks are skipped; check-ins still record.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="allow_multiple_shift_assignments"
            defaultChecked={initial.allowMultipleShiftAssignments}
            className="mt-1 h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
          />
          <span className="flex flex-col gap-1">
            <span className="font-medium text-ink-900">
              Allow overlapping Shift Assignments
            </span>
            <span className="text-xs text-ash-600">
              When on, the same employee can hold two Active Shift Assignments
              at once — useful for multi-role staff or rotating pairs. Off
              (default) rejects overlapping saves.
            </span>
          </span>
        </label>
      </section>

      <div className="-mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <SaveBtn />
      </div>
    </form>
  );
}

function SaveBtn() {
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
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Save settings
        </>
      )}
    </button>
  );
}
