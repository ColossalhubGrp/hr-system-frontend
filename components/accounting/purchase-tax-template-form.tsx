"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2, Plus } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createPurchaseTaxTemplateAction,
  updatePurchaseTaxTemplateAction,
  deletePurchaseTaxTemplateAction,
  type FormState,
} from "@/app/(workspace)/accounting/tax/purchase-templates/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { CHARGE_TYPES, CATEGORY, ADD_DEDUCT } from "@/lib/frappe/tax/purchase-template";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
type Company = { name: string };
type Line = {
  charge_type: string;
  account_head: string;
  description: string;
  rate: string;
  category: string;
  add_deduct_tax: string;
  cost_center: string;
  included_in_print_rate: boolean;
};
const EMPTY_LINE = (): Line => ({
  charge_type: "On Net Total",
  account_head: "",
  description: "",
  rate: "0",
  category: "Total",
  add_deduct_tax: "Add",
  cost_center: "",
  included_in_print_rate: false,
});

type Initial = {
  title: string;
  company: string;
  isDefault: boolean;
  disabled: boolean;
  taxes: Line[];
};

export function PurchaseTaxTemplateForm({
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
  const action = mode === "create" ? createPurchaseTaxTemplateAction : updatePurchaseTaxTemplateAction.bind(null, name ?? "");
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
      <FormSection title="Template" description="Reusable tax block. Category controls where the amount lands: expense (Total) or asset valuation.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title" htmlFor="title" error={fe.title} required>
            <TextInput id="title" name="title" defaultValue={initial?.title ?? ""} placeholder="e.g. Zimbabwe VAT 15% (Purchase)" />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={initial?.company ?? companies[0]?.name ?? ""} options={companies.map((c) => c.name)} />
          </Field>
          <Field label="Flags" htmlFor="is_default">
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input id="is_default" type="checkbox" name="is_default" defaultChecked={initial?.isDefault ?? false} className="h-4 w-4" />
                <span>Default for this company</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="disabled" defaultChecked={initial?.disabled ?? false} className="h-4 w-4" />
                <span>Disabled</span>
              </label>
            </div>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Charges" description="Each row is a line on the purchase-invoice tax table.">
        <div className="flex flex-col gap-3">
          {lines.map((l, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Charge type</label>
                <SelectInput value={l.charge_type} options={[...CHARGE_TYPES]} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, charge_type: e.target.value } : x)))} />
              </div>
              <div className="col-span-12 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Account head</label>
                <SelectInput value={l.account_head} options={[{ value: "", label: "—" }, ...accounts.map((a) => ({ value: a.name, label: a.name }))]} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, account_head: e.target.value } : x)))} />
              </div>
              <div className="col-span-8 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
                <TextInput value={l.description} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} />
              </div>
              <div className="col-span-4 md:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rate</label>
                <TextInput type="number" step="0.01" value={l.rate} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, rate: e.target.value } : x)))} className="tabular-nums" />
              </div>
              <div className="col-span-6 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Category</label>
                <SelectInput value={l.category} options={[...CATEGORY]} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, category: e.target.value } : x)))} />
              </div>
              <div className="col-span-5 md:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Add/Deduct</label>
                <SelectInput value={l.add_deduct_tax} options={[...ADD_DEDUCT]} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, add_deduct_tax: e.target.value } : x)))} />
              </div>
              <div className="col-span-1 flex justify-end">
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove line ${idx + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="col-span-12">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={l.included_in_print_rate} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, included_in_print_rate: e.target.checked } : x)))} className="h-3.5 w-3.5" />
                  Included in printed rate (tax-inclusive display)
                </label>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setLines((p) => [...p, EMPTY_LINE()])} className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40">
            <Plus className="h-3.5 w-3.5" />
            Add charge
          </button>
        </div>
        <input
          type="hidden"
          name="taxes_json"
          value={JSON.stringify(
            lines
              .filter((l) => l.account_head && l.description)
              .map((l) => ({
                charge_type: l.charge_type,
                account_head: l.account_head,
                description: l.description,
                rate: Number(l.rate) || 0,
                category: l.category,
                add_deduct_tax: l.add_deduct_tax,
                cost_center: l.cost_center || undefined,
                included_in_print_rate: l.included_in_print_rate,
              })),
          )}
        />
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/tax/purchase-templates" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
  const onSubmit = async () => { await deletePurchaseTaxTemplateAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}
