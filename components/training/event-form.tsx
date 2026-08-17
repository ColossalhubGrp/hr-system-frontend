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
import type { FormState } from "@/app/(workspace)/hr/training/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

const FALLBACK_TYPES = ["Internal", "External", "Selected", "Not Attended"];

export function TrainingEventForm({
  mode = "create",
  action,
  programs,
  suppliers,
  typeOptions,
  cancelHref,
  initial,
}: {
  mode?: "create" | "edit";
  action: Action;
  programs: Array<{ id: string; label: string }>;
  /** Existing ERPNext Supplier records. Empty on tenants that
   *  haven't configured any — the field is then hidden entirely
   *  (Frappe would reject free text with "Could not find
   *  Supplier: X"). */
  suppliers: string[];
  /** Accepted values for Training Event.type on this tenant.
   *  Reads real DocField metadata upstream so what's shown here
   *  is what Frappe will actually accept, matching either a
   *  Select field's options list or a Link field's record set. */
  typeOptions: string[];
  cancelHref: string;
  /** Pre-fill values for the edit flow. datetime-local inputs need
   *  "YYYY-MM-DDTHH:MM" — pass the Frappe string as-is; the input
   *  displays it fine after normalisation. */
  initial?: {
    eventName?: string | null;
    type?: string | null;
    trainingProgram?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    supplier?: string | null;
    introduction?: string | null;
  };
}) {
  const effectiveTypes =
    typeOptions.length > 0 ? typeOptions : FALLBACK_TYPES;
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  /** Frappe stores datetime as "YYYY-MM-DD HH:MM:SS" but the native
   *  <input type="datetime-local"> wants "YYYY-MM-DDTHH:MM". */
  const toInputDT = (v: string | null | undefined): string => {
    if (!v) return "";
    return v.replace(" ", "T").slice(0, 16);
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

      <FormSection title="Event">
        <Field
          label="Event name"
          htmlFor="event_name"
          required
          error={fe.event_name}
          wide
        >
          <TextInput
            id="event_name"
            name="event_name"
            placeholder="e.g. Q3 Compliance Refresher"
            defaultValue={initial?.eventName ?? undefined}
            invalid={Boolean(fe.event_name)}
          />
        </Field>
        <Field label="Type" htmlFor="type" required error={fe.type}>
          <SelectInput
            id="type"
            name="type"
            options={effectiveTypes}
            defaultValue={initial?.type ?? effectiveTypes[0]}
            invalid={Boolean(fe.type)}
          />
        </Field>
        <Field
          label="Training program"
          htmlFor="training_program"
          hint={
            programs.length === 0
              ? "No programs defined yet — optional link."
              : "Optional — group this event under a program."
          }
        >
          <SelectInput
            id="training_program"
            name="training_program"
            options={programs.map((p) => ({ value: p.id, label: p.label }))}
            defaultValue={initial?.trainingProgram ?? undefined}
            placeholder="— none —"
          />
        </Field>
        <Field
          label="Starts"
          htmlFor="start_time"
          required
          error={fe.start_time}
        >
          <TextInput
            id="start_time"
            name="start_time"
            type="datetime-local"
            defaultValue={toInputDT(initial?.startTime)}
            invalid={Boolean(fe.start_time)}
          />
        </Field>
        <Field label="Ends" htmlFor="end_time" error={fe.end_time}>
          <TextInput
            id="end_time"
            name="end_time"
            type="datetime-local"
            defaultValue={toInputDT(initial?.endTime)}
            invalid={Boolean(fe.end_time)}
          />
        </Field>
        <Field label="Location" htmlFor="location">
          <TextInput
            id="location"
            name="location"
            placeholder="e.g. Head Office Boardroom / Zoom"
            defaultValue={initial?.location ?? undefined}
          />
        </Field>
        {suppliers.length > 0 && (
          <Field
            label="Supplier"
            htmlFor="supplier"
            hint="External training provider, if any."
          >
            <SelectInput
              id="supplier"
              name="supplier"
              options={suppliers}
              defaultValue={initial?.supplier ?? undefined}
              placeholder="— none —"
            />
          </Field>
        )}
        <Field label="Introduction" htmlFor="introduction" wide>
          <TextArea
            id="introduction"
            name="introduction"
            rows={3}
            placeholder="What the event covers — appears in attendee invites."
            defaultValue={initial?.introduction ?? undefined}
          />
        </Field>
      </FormSection>

      <div className="-mx-1 mt-6 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
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
  const label =
    mode === "edit"
      ? pending
        ? "Saving…"
        : "Save changes"
      : pending
        ? "Scheduling…"
        : "Schedule event";
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
      {label}
    </button>
  );
}
