"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2, Plus, X } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createFiscalYearAction,
  updateFiscalYearAction,
  deleteFiscalYearAction,
  type FormState,
} from "@/app/(workspace)/accounting/masters/fiscal-year/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Company = { name: string };
type Initial = {
  yearStartDate: string;
  yearEndDate: string;
  disabled: boolean;
  companies: string[];
};

export function FiscalYearForm({
  mode,
  name,
  companies,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  companies: Company[];
  initial?: Initial;
}) {
  const action = mode === "create" ? createFiscalYearAction : updateFiscalYearAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  const [linked, setLinked] = useState<string[]>(initial?.companies ?? []);
  const [picker, setPicker] = useState<string>("");

  const addCompany = () => {
    if (picker && !linked.includes(picker)) setLinked((p) => [...p, picker]);
    setPicker("");
  };

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <FormSection title="Year" description="The label + the calendar bounds this year covers.">
        <div className="grid gap-4 sm:grid-cols-3">
          {mode === "create" ? (
            <Field label="Name" htmlFor="name" error={fe.name} required>
              <TextInput id="name" name="name" placeholder="2026 or 2026-2027" />
            </Field>
          ) : (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Year</div>
              <div className="mt-1 text-sm font-mono font-semibold text-foreground">{name}</div>
            </div>
          )}
          <Field label="Start date" htmlFor="year_start_date" error={fe.year_start_date} required>
            <TextInput
              id="year_start_date"
              name="year_start_date"
              type="date"
              defaultValue={initial?.yearStartDate ?? ""}
            />
          </Field>
          <Field label="End date" htmlFor="year_end_date" error={fe.year_end_date} required>
            <TextInput
              id="year_end_date"
              name="year_end_date"
              type="date"
              defaultValue={initial?.yearEndDate ?? ""}
            />
          </Field>
          <Field label="Disabled" htmlFor="disabled">
            <label className="flex items-center gap-2 text-sm">
              <input id="disabled" type="checkbox" name="disabled" defaultChecked={initial?.disabled ?? false} className="h-4 w-4" />
              <span className="text-muted-foreground">Hide from picker without deleting.</span>
            </label>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Companies" description="Which companies use this fiscal year. Leave empty to apply to all.">
        <div className="flex flex-wrap items-center gap-2">
          {linked.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-chip border border-border/60 bg-muted/40 px-3 py-1 text-sm">
              {c}
              <button type="button" onClick={() => setLinked((p) => p.filter((n) => n !== c))} aria-label={`Unlink ${c}`}>
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-2">
            <SelectInput
              value={picker}
              options={[
                { value: "", label: "Add a company…" },
                ...companies.filter((c) => !linked.includes(c.name)).map((c) => ({ value: c.name, label: c.name })),
              ]}
              onChange={(e) => setPicker(e.target.value)}
            />
            <button type="button" onClick={addCompany} className="inline-flex items-center gap-1 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40">
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
        <input type="hidden" name="companies_json" value={JSON.stringify(linked)} />
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DeleteBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/masters/fiscal-year" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">
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
      {pending ? "Saving…" : mode === "create" ? "Save year" : "Save changes"}
    </button>
  );
}

function DeleteBtn({ name }: { name: string }) {
  const onSubmit = async () => {
    await deleteFiscalYearAction(name);
  };
  return (
    <form action={onSubmit}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          if (!confirm(`Delete fiscal year "${name}"? This can't be undone.`)) e.preventDefault();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </form>
  );
}
