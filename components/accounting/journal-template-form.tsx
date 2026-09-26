"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2, Plus } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createJournalTemplateAction,
  updateJournalTemplateAction,
  deleteJournalTemplateAction,
  type FormState,
} from "@/app/(workspace)/accounting/masters/journal-templates/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { VOUCHER_TYPES } from "@/lib/frappe/masters/journal-entry-template-constants";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
type Company = { name: string };
type Line = { account: string; debit: string; credit: string; cost_center: string };
const EMPTY_LINE = (): Line => ({ account: "", debit: "", credit: "", cost_center: "" });

type Initial = {
  templateTitle: string;
  voucherType: string;
  company: string | null;
  accounts: Line[];
};

export function JournalTemplateForm({
  mode,
  name,
  companies,
  accounts,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  companies: Company[];
  accounts: AccountOption[];
  initial?: Initial;
}) {
  const action = mode === "create" ? createJournalTemplateAction : updateJournalTemplateAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  const [lines, setLines] = useState<Line[]>(initial?.accounts && initial.accounts.length > 0 ? initial.accounts : [EMPTY_LINE(), EMPTY_LINE()]);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Template" description="A saved layout for a recurring Journal Entry — voucher type + accounts.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title" htmlFor="template_title" error={fe.template_title} required>
            <TextInput id="template_title" name="template_title" defaultValue={initial?.templateTitle ?? ""} placeholder="e.g. Payroll accrual - Zimbabwe" />
          </Field>
          <Field label="Voucher type" htmlFor="voucher_type" error={fe.voucher_type} required>
            <SelectInput id="voucher_type" name="voucher_type" defaultValue={initial?.voucherType ?? "Journal Entry"} options={[...VOUCHER_TYPES]} />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company}>
            <SelectInput
              id="company"
              name="company"
              defaultValue={initial?.company ?? ""}
              options={[{ value: "", label: "Any company" }, ...companies.map((c) => ({ value: c.name, label: c.name }))]}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Default accounts" description="Pre-filled lines for the accounts grid. Users can edit values in the actual entry.">
        <div className="flex flex-col gap-3">
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-5">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Account #{idx + 1}</label>
                <SelectInput
                  value={line.account}
                  options={[{ value: "", label: "—" }, ...accounts.map((a) => ({ value: a.name, label: a.name }))]}
                  onChange={(e) => setLines((p) => p.map((l, i) => (i === idx ? { ...l, account: e.target.value } : l)))}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Debit</label>
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.debit}
                  onChange={(e) => setLines((p) => p.map((l, i) => (i === idx ? { ...l, debit: e.target.value, credit: e.target.value ? "" : l.credit } : l)))}
                  className="tabular-nums"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Credit</label>
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.credit}
                  onChange={(e) => setLines((p) => p.map((l, i) => (i === idx ? { ...l, credit: e.target.value, debit: e.target.value ? "" : l.debit } : l)))}
                  className="tabular-nums"
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cost centre</label>
                <TextInput
                  value={line.cost_center}
                  onChange={(e) => setLines((p) => p.map((l, i) => (i === idx ? { ...l, cost_center: e.target.value } : l)))}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove line ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLines((p) => [...p, EMPTY_LINE()])}
            className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add line
          </button>
        </div>
        <input
          type="hidden"
          name="accounts_json"
          value={JSON.stringify(
            lines
              .filter((l) => l.account)
              .map((l) => ({
                account: l.account,
                debit: Number(l.debit) || 0,
                credit: Number(l.credit) || 0,
                cost_center: l.cost_center || undefined,
              })),
          )}
        />
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/masters/journal-templates" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save template" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteJournalTemplateAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}
