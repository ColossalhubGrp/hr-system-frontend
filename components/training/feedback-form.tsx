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
import type { FormState } from "@/app/(workspace)/hr/training/[id]/results/actions";

const EMPTY: FormState = {};

export function TrainingFeedbackForm({
  eventId,
  attendees,
  action,
}: {
  eventId: string;
  attendees: Array<{ employee: string; employeeName: string | null }>;
  action: (eventId: string, prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const bound = action.bind(null, eventId);
  const [state, dispatch] = useFormState(bound, EMPTY);
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

      <FormSection title="Feedback">
        <Field label="Attendee" htmlFor="employee" required error={fe.employee}>
          <SelectInput
            id="employee"
            name="employee"
            options={attendees.map((a) => ({
              value: a.employee,
              label: `${a.employeeName ?? a.employee} (${a.employee})`,
            }))}
            placeholder={attendees.length ? "Pick an attendee" : "No attendees yet"}
          />
        </Field>
        <Field label="Rating" htmlFor="rating" hint="0 – 5">
          <TextInput id="rating" name="rating" type="number" step="0.5" min="0" max="5" />
        </Field>
        <Field label="Feedback" htmlFor="feedback" required error={fe.feedback} wide>
          <TextArea id="feedback" name="feedback" rows={4} invalid={Boolean(fe.feedback)} />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail">
        <Link
          href={`/hr/training/${encodeURIComponent(eventId)}` as Route}
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
      {pending ? "Saving…" : "Submit feedback"}
    </button>
  );
}
