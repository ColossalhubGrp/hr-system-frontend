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

const TYPES = ["Internal", "External", "Selected", "Not Attended"];

export function TrainingEventForm({
  action,
  programs,
  cancelHref,
}: {
  action: Action;
  programs: Array<{ id: string; label: string }>;
  cancelHref: string;
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
            invalid={Boolean(fe.event_name)}
          />
        </Field>
        <Field label="Type" htmlFor="type" required error={fe.type}>
          <SelectInput
            id="type"
            name="type"
            options={TYPES}
            defaultValue="Internal"
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
            invalid={Boolean(fe.start_time)}
          />
        </Field>
        <Field label="Ends" htmlFor="end_time" error={fe.end_time}>
          <TextInput
            id="end_time"
            name="end_time"
            type="datetime-local"
            invalid={Boolean(fe.end_time)}
          />
        </Field>
        <Field label="Location" htmlFor="location">
          <TextInput
            id="location"
            name="location"
            placeholder="e.g. Head Office Boardroom / Zoom"
          />
        </Field>
        <Field
          label="Supplier"
          htmlFor="supplier"
          hint="External training provider, if any."
        >
          <TextInput
            id="supplier"
            name="supplier"
            placeholder="e.g. PwC Zimbabwe"
          />
        </Field>
        <Field label="Introduction" htmlFor="introduction" wide>
          <TextArea
            id="introduction"
            name="introduction"
            rows={3}
            placeholder="What the event covers — appears in attendee invites."
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
      <Save className="h-4 w-4" />
      {pending ? "Scheduling…" : "Schedule event"}
    </button>
  );
}
