"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2, Plus } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createTaxWithholdingAction,
  updateTaxWithholdingAction,
  deleteTaxWithholdingAction,
  type FormState,
} from "@/app/(workspace)/accounting/tax/withholding/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};
type Company = { name: string };
type Rate = { from_date: string; to_date: string; tax_withholding_rate: string; single_threshold: string; cumulative_threshold: string };
type Acct = { company: string; account: string };
const EMPTY_RATE = (): Rate => ({ from_date: "", to_date: "", tax_withholding_rate: "", single_threshold: "0", cumulative_threshold: "0" });
const EMPTY_ACCT = (): Acct => ({ company: "", account: "" });

type Initial = {
  category: string;
  roundOff: boolean;
  considerPartyLedgerAmount: boolean;
  rates: Rate[];
  accounts: Acct[];
};

export function TaxWithholdingForm({
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
  const action = mode === "create" ? createTaxWithholdingAction : updateTaxWithholdingAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [rates, setRates] = useState<Rate[]>(initial?.rates && initial.rates.length ? initial.rates : [EMPTY_RATE()]);
  const [accts, setAccts] = useState<Acct[]>(initial?.accounts && initial.accounts.length ? initial.accounts : [EMPTY_ACCT()]);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Category" description="What the WHT/TDS bucket is called and how it computes.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="category_name" error={fe.category_name} required>
            <TextInput id="category_name" name="category_name" defaultValue={initial?.category ?? ""} placeholder="e.g. Section 194J - Professional Services" />
          </Field>
          <Field label="Behaviour" htmlFor="round_off_tax_amount">
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input id="round_off_tax_amount" type="checkbox" name="round_off_tax_amount" defaultChecked={initial?.roundOff ?? false} className="h-4 w-4" />
                <span>Round off the WHT amount</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="consider_party_ledger_amount" defaultChecked={initial?.considerPartyLedgerAmount ?? false} className="h-4 w-4" />
                <span>Compute cumulative using party ledger amount</span>
              </label>
            </div>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Rates" description="Per-period rate and thresholds. Add one per fiscal year / statute update.">
        <div className="flex flex-col gap-3">
          {rates.map((r, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <RateField className="col-span-6 md:col-span-2" label="From" type="date" value={r.from_date} onChange={(v) => setRates((p) => p.map((x, i) => (i === idx ? { ...x, from_date: v } : x)))} />
              <RateField className="col-span-6 md:col-span-2" label="To" type="date" value={r.to_date} onChange={(v) => setRates((p) => p.map((x, i) => (i === idx ? { ...x, to_date: v } : x)))} />
              <RateField className="col-span-4 md:col-span-2" label="Rate (%)" type="number" value={r.tax_withholding_rate} onChange={(v) => setRates((p) => p.map((x, i) => (i === idx ? { ...x, tax_withholding_rate: v } : x)))} />
              <RateField className="col-span-4 md:col-span-2" label="Single thresh." type="number" value={r.single_threshold} onChange={(v) => setRates((p) => p.map((x, i) => (i === idx ? { ...x, single_threshold: v } : x)))} />
              <RateField className="col-span-4 md:col-span-3" label="Cumulative thresh." type="number" value={r.cumulative_threshold} onChange={(v) => setRates((p) => p.map((x, i) => (i === idx ? { ...x, cumulative_threshold: v } : x)))} />
              <div className="col-span-12 md:col-span-1 flex justify-end">
                {rates.length > 1 && (
                  <button type="button" onClick={() => setRates((p) => p.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove rate ${idx + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setRates((p) => [...p, EMPTY_RATE()])} className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40">
            <Plus className="h-3.5 w-3.5" />
            Add rate
          </button>
        </div>
        <input type="hidden" name="rates_json" value={JSON.stringify(rates.map((r) => ({ from_date: r.from_date, to_date: r.to_date, tax_withholding_rate: Number(r.tax_withholding_rate) || 0, single_threshold: Number(r.single_threshold) || 0, cumulative_threshold: Number(r.cumulative_threshold) || 0 })).filter((r) => r.from_date && r.to_date && r.tax_withholding_rate > 0))} />
      </FormSection>

      <FormSection title="Company accounts" description="Which GL account the withheld tax posts to per company.">
        <div className="flex flex-col gap-3">
          {accts.map((a, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-5">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Company #{idx + 1}</label>
                <SelectInput value={a.company} options={[{ value: "", label: "—" }, ...companies.map((c) => ({ value: c.name, label: c.name }))]} onChange={(e) => setAccts((p) => p.map((x, i) => (i === idx ? { ...x, company: e.target.value } : x)))} />
              </div>
              <div className="col-span-11 md:col-span-6">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Account</label>
                <TextInput value={a.account} onChange={(e) => setAccts((p) => p.map((x, i) => (i === idx ? { ...x, account: e.target.value } : x)))} placeholder="e.g. Withholding Tax Payable - CH" />
              </div>
              <div className="col-span-1 flex justify-end">
                {accts.length > 1 && (
                  <button type="button" onClick={() => setAccts((p) => p.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove account ${idx + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setAccts((p) => [...p, EMPTY_ACCT()])} className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40">
            <Plus className="h-3.5 w-3.5" />
            Add account
          </button>
        </div>
        <input type="hidden" name="accounts_json" value={JSON.stringify(accts.filter((a) => a.company && a.account))} />
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/tax/withholding" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
          <SubBtn mode={mode} />
        </div>
      </div>
    </form>
  );
}

function RateField({ className, label, type, value, onChange }: { className: string; label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      <TextInput type={type} value={value} onChange={(e) => onChange(e.target.value)} className={type === "number" ? "tabular-nums" : ""} />
    </div>
  );
}

function SubBtn({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save category" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteTaxWithholdingAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}
