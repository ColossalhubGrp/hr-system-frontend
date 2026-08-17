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

export function TrainingProgramForm({
  mode = "create",
  action,
  companies,
  suppliers,
  hasVisibilityField = true,
  cancelHref,
  initial,
}: {
  mode?: "create" | "edit";
  action: Action;
  /** Tenant companies. Frappe HR treats Training Program.company
   *  as required on this schema — the picker defaults to the
   *  single company when the tenant only has one. */
  companies: string[];
  suppliers: string[];
  /** Whether the tenant's Training Program schema has `is_public`.
   *  Some Frappe HR variants ship without it; hiding the control
   *  in that case avoids the confusing "ticked but saved Internal"
   *  outcome the user hit. */
  hasVisibilityField?: boolean;
  cancelHref: string;
  initial?: {
    trainingProgramName?: string | null;
    company?: string | null;
    supplier?: string | null;
    description?: string | null;
    isPublic?: boolean | null;
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

      <FormSection title="Program">
        <Field
          label="Program name"
          htmlFor="training_program_name"
          required
          error={fe.training_program_name}
          wide
        >
          <TextInput
            id="training_program_name"
            name="training_program_name"
            placeholder="e.g. Leadership Fundamentals"
            defaultValue={initial?.trainingProgramName ?? undefined}
            invalid={Boolean(fe.training_program_name)}
          />
        </Field>
        <Field
          label="Company"
          htmlFor="company"
          required
          error={fe.company}
        >
          <SelectInput
            id="company"
            name="company"
            options={companies}
            defaultValue={
              initial?.company ?? (companies.length === 1 ? companies[0] : undefined)
            }
            placeholder="Select company"
            invalid={Boolean(fe.company)}
          />
        </Field>
        {suppliers.length > 0 && (
          <Field
            label="Supplier"
            htmlFor="supplier"
            hint="External provider, if applicable."
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
        {hasVisibilityField && (
          <Field
            label="Visibility"
            htmlFor="is_public"
            hint="Public programs can be browsed by every employee; internal ones are HR-facing only."
          >
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background p-2.5 text-sm has-[:checked]:border-primary/40 has-[:checked]:bg-primary/[0.04]">
              <input
                type="checkbox"
                name="is_public"
                id="is_public"
                defaultChecked={initial?.isPublic ?? false}
                className="h-4 w-4 accent-primary"
              />
              <span>Make public</span>
            </label>
          </Field>
        )}
        <Field
          label="Description"
          htmlFor="description"
          required
          error={fe.description}
          wide
        >
          <TextArea
            id="description"
            name="description"
            rows={3}
            placeholder="What the program covers."
            defaultValue={initial?.description ?? undefined}
            invalid={Boolean(fe.description)}
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
        ? mode === "edit"
          ? "Saving…"
          : "Saving…"
        : mode === "edit"
          ? "Save changes"
          : "Save program"}
    </button>
  );
}
