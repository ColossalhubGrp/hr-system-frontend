"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, MapPin, Save } from "lucide-react";
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

export function ShiftLocationForm({
  mode,
  action,
  companies,
  cancelHref,
  initial,
}: {
  mode: "create" | "edit";
  action: Action;
  companies: string[];
  cancelHref: string;
  initial?: {
    name?: string;
    locationName?: string;
    company?: string | null;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    address?: string | null;
    isActive?: boolean;
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

      <FormSection title="Location">
        <Field
          label="Name"
          htmlFor="location_name"
          required
          error={fe.location_name}
          hint={mode === "create" ? "e.g. Harare HQ" : undefined}
        >
          <TextInput
            id="location_name"
            name="location_name"
            defaultValue={initial?.locationName}
            invalid={Boolean(fe.location_name)}
            readOnly={mode === "edit"}
            disabled={mode === "edit"}
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
          label="Latitude"
          htmlFor="latitude"
          required
          error={fe.latitude}
          hint="Decimal degrees, e.g. -17.829"
        >
          <TextInput
            id="latitude"
            name="latitude"
            type="number"
            step="0.000001"
            defaultValue={initial?.latitude?.toString() ?? ""}
            invalid={Boolean(fe.latitude)}
          />
        </Field>
        <Field
          label="Longitude"
          htmlFor="longitude"
          required
          error={fe.longitude}
          hint="Decimal degrees, e.g. 31.053"
        >
          <TextInput
            id="longitude"
            name="longitude"
            type="number"
            step="0.000001"
            defaultValue={initial?.longitude?.toString() ?? ""}
            invalid={Boolean(fe.longitude)}
          />
        </Field>
        <Field
          label="Geofence radius"
          htmlFor="radius_meters"
          hint="Metres — employees must check in within this radius."
        >
          <TextInput
            id="radius_meters"
            name="radius_meters"
            type="number"
            min="0"
            step="10"
            defaultValue={(initial?.radiusMeters ?? 100).toString()}
          />
        </Field>
        <Field label="Address" htmlFor="address" wide>
          <TextArea
            id="address"
            name="address"
            defaultValue={initial?.address ?? ""}
            rows={2}
          />
        </Field>
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={initial?.isActive ?? true}
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Active — allow this location for check-ins
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
      {mode === "create" ? <MapPin className="h-4 w-4" /> : <Save className="h-4 w-4" />}
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create location"
          : "Save changes"}
    </button>
  );
}
