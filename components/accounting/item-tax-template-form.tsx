"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2, Plus } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createItemTaxTemplateAction,
  updateItemTaxTemplateAction,
  deleteItemTaxTemplateAction,
  type FormState,
} from "@/app/(workspace)/accounting/tax/item-templates/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
type Company = { name: string };
type Line = { tax_type: string; tax_rate: string };
const EMPTY_LINE = (): Line => ({ tax_type: "", tax_rate: "0" });

type Initial = { title: string; company: string; disabled: boolean; taxes: Line[] };

export function ItemTaxTemplateForm({
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
  const action = mode === "create" ? createItemTaxTemplateAction : updateItemTaxTemplateAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [lines, setLines] = useState<Line[]>(initial?.taxes && initial.taxes.length ? initial.taxes : [EMPTY_LINE()]);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Template" description="Applies to specific items — override the default tax on their line.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title" htmlFor="title" error={fe.title} required>
            <TextInput id="title" name="title" defaultValue={initial?.title ?? ""} placeholder="e.g. VAT 15% Standard" />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={initial?.company ?? companies[0]?.name ?? ""} options={companies.map((c) => c.name)} />
          </Field>
          <Field label="Disabled" htmlFor="disabled">
            <label className="flex items-center gap-2 text-sm">
              <input id="disabled" type="checkbox" name="disabled" defaultChecked={initial?.disabled ?? false} className="h-4 w-4" />
              <span className="text-muted-foreground">Hide from picker without deleting.</span>
            </label>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Rates" description="Which tax account and the % that overrides the item's default.">
        <div className="flex flex-col gap-3">
          {lines.map((l, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-8">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tax account #{idx + 1}</label>
                <SelectInput value={l.tax_type} options={[...accounts.map((a) => ({ value: a.name, label: a.name }))]} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, tax_type: e.target.value } : x)))} />
              </div>
              <div className="col-span-11 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rate (%)</label>
                <TextInput type="number" step="0.01" value={l.tax_rate} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, tax_rate: e.target.value } : x)))} className="tabular-nums" />
              </div>
              <div className="col-span-1 flex justify-end">
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove line ${idx + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setLines((p) => [...p, EMPTY_LINE()])} className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40">
            <Plus className="h-3.5 w-3.5" />
            Add rate
          </button>
        </div>
        <input type="hidden" name="taxes_json" value={JSON.stringify(lines.filter((l) => l.tax_type).map((l) => ({ tax_type: l.tax_type, tax_rate: Number(l.tax_rate) || 0 })))} />
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/tax/item-templates" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
  const onSubmit = async () => { await deleteItemTaxTemplateAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}
