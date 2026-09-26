"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, TextArea, TextInput } from "@/components/employee/form-bits";
import {
  createTermsAction,
  updateTermsAction,
  deleteTermsAction,
  type FormState,
} from "@/app/(workspace)/accounting/masters/terms/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Initial = {
  title: string;
  disabled: boolean;
  terms: string;
};

export function TermsForm({
  mode,
  name,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  initial?: Initial;
}) {
  const action = mode === "create" ? createTermsAction : updateTermsAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <FormSection title="Template" description="A reusable block of legal text — pick it from Quote/Order/Invoice to print at the foot of the doc.">
        <div className="grid gap-4">
          <Field label="Title" htmlFor="title" error={fe.title} required>
            <TextInput
              id="title"
              name="title"
              defaultValue={initial?.title ?? ""}
              placeholder="e.g. Standard sale terms, 30-day cancellation"
            />
          </Field>
          <Field label="Disabled" htmlFor="disabled">
            <label className="flex items-center gap-2 text-sm">
              <input id="disabled" type="checkbox" name="disabled" defaultChecked={initial?.disabled ?? false} className="h-4 w-4" />
              <span className="text-muted-foreground">Hide from the picker without deleting.</span>
            </label>
          </Field>
          <Field label="Terms" htmlFor="terms" error={fe.terms} required>
            <TextArea
              id="terms"
              name="terms"
              rows={12}
              defaultValue={initial?.terms ?? ""}
              placeholder="Full text of the terms. Markdown-style newlines are preserved."
              className="font-mono text-sm"
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DeleteBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={"/accounting/masters/terms" as Route}
            className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
          >
            Cancel
          </Link>
          <SubmitBtn mode={mode} />
        </div>
      </div>
    </form>
  );
}

function SubmitBtn({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring",
        pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : mode === "create" ? "Save template" : "Save changes"}
    </button>
  );
}

function DeleteBtn({ name }: { name: string }) {
  const onSubmit = async () => {
    await deleteTermsAction(name);
  };
  return (
    <form action={onSubmit}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          if (!confirm(`Delete "${name}"? This can't be undone.`)) e.preventDefault();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </form>
  );
}
