"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CalendarPlus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Field, TextInput } from "@/components/employee/form-bits";
import type { MaterialiseState } from "@/app/(workspace)/hr/shift-management/actions";

type Action = (
  prev: MaterialiseState,
  form: FormData,
) => Promise<MaterialiseState>;
const EMPTY: MaterialiseState = {};

/**
 * Renders the inline "create real Shift Assignments from this Schedule
 * Assignment" form. Each selected date in the range that matches the
 * Schedule's weekday flags (and isn't a holiday) becomes one Shift
 * Assignment via the parent Server Action.
 */
export function MaterialisePanel({
  action,
  defaultFrom,
  defaultTo,
}: {
  action: Action;
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
          Materialise to Shift Assignments
        </h2>
        <p className="text-xs text-ash-500">
          Expands the schedule across the range — one real Shift Assignment per
          matching day. Holidays and off-days are skipped.
        </p>
      </div>

      {state.error && (
        <p
          role="alert"
          className="mb-3 flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      {typeof state.created === "number" && (
        <p
          role="status"
          className={cn(
            "mb-3 flex items-center gap-2 rounded-card border px-3 py-2 text-xs",
            state.created > 0
              ? "border-rise/30 bg-rise/[0.06] text-rise"
              : "border-hairline bg-canvas text-ash-700",
          )}
        >
          {state.created > 0 ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          Created {state.created} assignment{state.created === 1 ? "" : "s"} ·
          Skipped {state.skipped ?? 0} (off-day or holiday)
          {state.failures && state.failures.length > 0
            ? ` · ${state.failures.length} failed`
            : ""}
        </p>
      )}

      <form action={dispatch} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field
          label="From"
          htmlFor="materialise_from"
          required
          error={fe.from}
        >
          <TextInput
            id="materialise_from"
            name="from"
            type="date"
            defaultValue={defaultFrom}
            invalid={Boolean(fe.from)}
          />
        </Field>
        <Field
          label="To"
          htmlFor="materialise_to"
          required
          error={fe.to}
        >
          <TextInput
            id="materialise_to"
            name="to"
            type="date"
            defaultValue={defaultTo}
            invalid={Boolean(fe.to)}
          />
        </Field>
        <div className="flex items-end">
          <SubmitBtn />
        </div>
      </form>

      {state.failures && state.failures.length > 0 && (
        <details className="mt-3 rounded-xl border border-fall/30 bg-fall/[0.04] px-3 py-2 text-xs text-fall">
          <summary className="cursor-pointer font-medium">
            {state.failures.length} day
            {state.failures.length === 1 ? "" : "s"} failed
          </summary>
          <ul className="mt-2 space-y-1 pl-5 list-disc">
            {state.failures.map((f, i) => (
              <li key={`${f.date}-${i}`}>
                <span className="font-mono">{f.date}</span>: {f.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      <CalendarPlus className="h-4 w-4" />
      {pending ? "Materialising…" : "Materialise"}
    </button>
  );
}
