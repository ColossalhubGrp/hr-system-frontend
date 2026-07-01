"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FormSection,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/admin/references/actions";
import type { ReferenceRow } from "@/lib/references/types";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

/**
 * One row of a reference master — create or edit. Uses the workspace's
 * shared form-bits so it matches the rest of the admin pages visually.
 */
export function ValueForm({
  action,
  initial,
  defaultCompany,
}: {
  action: Action;
  initial?: ReferenceRow;
  /** When set, every new row is created against this company. Hidden
   *  field on the form; admins don't need to pick it per row. */
  defaultCompany?: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {defaultCompany && (
        <input type="hidden" name="company" value={defaultCompany} />
      )}
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}

      <FormSection title="Record">
        <Field
          label="Title"
          htmlFor="title"
          required
          error={fe.title}
          wide
          hint="Shown in dropdowns. Must be unique."
        >
          <TextInput
            id="title"
            name="title"
            defaultValue={initial?.title}
            invalid={Boolean(fe.title)}
            placeholder="e.g. Reference"
          />
        </Field>

        <Field
          label="Code"
          htmlFor="code"
          error={fe.code}
          hint="Optional. Stable machine ID — UPPER_CASE recommended."
        >
          <TextInput
            id="code"
            name="code"
            defaultValue={initial?.code ?? ""}
            placeholder="REFERENCE"
          />
        </Field>

        <Field label="Sort order" htmlFor="sort_order" error={fe.sort_order}>
          <TextInput
            id="sort_order"
            name="sort_order"
            type="number"
            step="1"
            defaultValue={String(initial?.sort_order ?? 0)}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          error={fe.description}
          wide
        >
          <TextArea
            id="description"
            name="description"
            rows={3}
            defaultValue={initial?.description ?? ""}
          />
        </Field>

        <Field label="Active" htmlFor="is_active">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              id="is_active"
              type="checkbox"
              name="is_active"
              defaultChecked={initial ? Boolean(initial.is_active) : true}
              value="true"
              className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-muted-foreground">
              Visible in dropdowns. Uncheck to hide without deleting.
            </span>
          </label>
        </Field>
      </FormSection>

      <SubmitRow />
    </form>
  );
}

function SubmitRow() {
  return (
    <div className="flex items-center justify-end gap-2">
      <Submit />
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}
