"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Upload } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import { importCoaAction, type FormState } from "@/app/(workspace)/accounting/tools/coa-importer/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function CoaImporterForm({ companies }: { companies: string[] }) {
  const [state, dispatch] = useFormState(importCoaAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={dispatch} className="flex flex-col gap-5" encType="multipart/form-data">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Upload" description="A CSV or JSON template that describes the account hierarchy — one row per account with parent/is-group/root-type columns.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={companies[0] ?? ""} options={companies} />
          </Field>
          <Field label="Chart name (optional)" htmlFor="chart_name" error={fe.chart_name}>
            <TextInput id="chart_name" name="chart_name" placeholder="e.g. Standard" />
          </Field>
          <Field label="Chart file" htmlFor="file" error={fe.file} required wide>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,.json,application/json,text/csv"
              className="block w-full rounded-chip border border-input bg-transparent p-2 text-sm file:mr-3 file:rounded-chip file:border-0 file:bg-ink-800 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-700"
            />
          </Field>
        </div>
      </FormSection>
      <p className="text-xs text-muted-foreground">
        The company must not already have accounts posted against it — ERPNext will refuse to overwrite a live chart. On success you&rsquo;ll land on the new Chart of Accounts tree.
      </p>
      <div className="flex items-center justify-end gap-2">
        <Link href={"/accounting" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
        <Sub />
      </div>
    </form>
  );
}

function Sub() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Upload className="h-4 w-4" />
      {pending ? "Importing…" : "Import chart"}
    </button>
  );
}
