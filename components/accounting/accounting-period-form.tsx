"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createAccountingPeriodAction,
  updateAccountingPeriodAction,
  deleteAccountingPeriodAction,
  type FormState,
} from "@/app/(workspace)/accounting/masters/periods/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
type Company = { name: string };
type Initial = { periodName: string; startDate: string; endDate: string; company: string };

export function AccountingPeriodForm({
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
  const action = mode === "create" ? createAccountingPeriodAction : updateAccountingPeriodAction.bind(null, name ?? "");
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
      <FormSection title="Period" description="A locked window of dates — most teams lock a month right after they close it.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="period_name" error={fe.period_name} required>
            <TextInput id="period_name" name="period_name" defaultValue={initial?.periodName ?? ""} placeholder="e.g. January 2026" />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={initial?.company ?? companies[0]?.name ?? ""} options={companies.map((c) => c.name)} />
          </Field>
          <Field label="Start date" htmlFor="start_date" error={fe.start_date} required>
            <TextInput id="start_date" name="start_date" type="date" defaultValue={initial?.startDate ?? ""} />
          </Field>
          <Field label="End date" htmlFor="end_date" error={fe.end_date} required>
            <TextInput id="end_date" name="end_date" type="date" defaultValue={initial?.endDate ?? ""} />
          </Field>
        </div>
      </FormSection>
      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/masters/periods" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
          <SubBtn mode={mode} />
        </div>
      </div>
    </form>
  );
}

function SubBtn({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : mode === "create" ? "Save period" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteAccountingPeriodAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete period "${name}"? This can't be undone.`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}
